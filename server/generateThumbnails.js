const fs = require("fs")
const path = require("path")

const os = require("os")
const child_process = require("child_process")
const zlib = require("zlib")

const sharp = require("sharp")


//Calls python code to generate thumbnails.
//We do this with PNGs, as they are lossless - images are renamed, etc, later.
function pythonGenerateThumbnails(pathToNIFTI, outputNames) {
	let process = child_process.spawn("python3", [
		path.join(__dirname, "generateThumbnails.py"),
		pathToNIFTI,
	].concat(outputNames), {
		cwd: global.thumbnailsDir
	})

	return new Promise((resolve, reject) => {
		process.on('close', resolve);
	})
}

//Use sharp to generate images of the desired height, type, and size for the web.
async function processThumbnails(inputNames, outputNames) {
	let imageProcessors = []
	for (let i=0;i<inputNames.length;i++) {
		let imagePath = path.join(global.thumbnailsDir, inputNames[i])
		imageProcessors.push(await sharp(imagePath))
	}

	//Downsize all thumbnails to 180 pixels tall.
	for (let i=0;i<imageProcessors.length;i++) {
		let imageProcessor = imageProcessors[i]
		await imageProcessor
			.resize({height: 180})
			.webp({
				reductionEffort: 6, //Could be slow. 0-6 for CPU used to compress. Default 4
				quality: 80, //Default 80.
			})
			.toFile(path.join(global.thumbnailsDir, outputNames[i]))
	}
}


async function generateThumbnails(pathToNIFTI) {
	//Generate thumbnails.

	let outputName = path.basename(pathToNIFTI)

	let finalType = "webp"
	let outputNames = ["x","y","z"].map((view) => {
		return outputName + `.${view}.${finalType}`
	})

	//If we don't need to generate any images (already cached), then don't generate any.
	let modifiedNifti = fs.statSync(pathToNIFTI).mtime
	if (
		outputNames.every((fileName) => {
			let filePath = path.join(global.thumbnailsDir, fileName)
			if (!fs.existsSync(filePath)) {return false} //Need to regenerate. Doesn't exist.
			let modified = fs.statSync(filePath).mtime
			if (modified < modifiedNifti) {return false} //Nifti modified more recently than thumbnail. Thumbnail old.
			return true
		})
	) {
		return outputNames
	}

	//Currently, generateThumbnails.py requires the entire decompressed file to generate thumbnails,
	//however can read portions off disk just fine it appears.
	//It currently runs out of memory on some systems with larger files, but is fine when the decompressed file is used from disk.
	//Therefore, decompress large files to disk on systems with little memory.

	//This should clean up stuff the next run even if broken GZIP files are left around once. May have one load with extra files.
	let tempPath;
	if (pathToNIFTI.endsWith(".nii.gz")) {
		if (fs.statSync(pathToNIFTI).size > os.freemem() / 8) {
			tempPath = pathToNIFTI.slice(0, -3)
			let unzipper = zlib.createGunzip()
			await new Promise((resolve, reject) => {
				let stream = fs.createReadStream(pathToNIFTI)
				let dest = fs.createWriteStream(tempPath)
				let writeStream = stream.pipe(unzipper).pipe(dest)
				writeStream.on("finish", resolve)
			})
		}
	}

	//Temporary names used for not-yet-processed python generated thumbnails.
	const tempNames = [
		"x.png",
		"y.png",
		"z.png"
	]

	try {
		await pythonGenerateThumbnails(tempPath || pathToNIFTI, tempNames)
		await processThumbnails(tempNames, outputNames)

		return outputNames
	}
	finally {
		if (tempPath && fs.existsSync(tempPath)) {
			fs.unlinkSync(tempPath)
		}

		//Clean up the temporary images. 
		tempNames.forEach((name) => {
			let filePath = path.join(global.thumbnailsDir, name)
			if (fs.existsSync(filePath)) {fs.unlinkSync(filePath)}
		})
	}
}


module.exports = generateThumbnails

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
		path.join(__dirname, "python", "generateThumbnails.py"),
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

	//Temporary names used for not-yet-processed python generated thumbnails.
	const tempNames = outputNames.map((name) => {return name + ".png"})
	let tempPath;
	try {
		//Currently, generateThumbnails.py requires the entire decompressed file to generate thumbnails.
		//Therefore, on systems with little memory, decompress to disk first.

		//This should clean up stuff the next run even if broken GZIP files are left around once. May have one load with extra files.
		if (pathToNIFTI.endsWith(".nii.gz")) {
			//We are decompressing, so if file size is os.freemem(), we will swap.
			//A bit of swap is fine though. Not a massive amount.

			//TODO: Put these in cache instead of dataDir.
			if (fs.statSync(pathToNIFTI).size > os.freemem()) {
				console.warn("WRITING TO DISK!!!")
				tempPath = path.join(global.cacheDir, outputName + path.extname(pathToNIFTI))
				let unzipper = zlib.createGunzip()
				await new Promise((resolve, reject) => {
					let stream = fs.createReadStream(pathToNIFTI)
					let dest = fs.createWriteStream(tempPath)
					let writeStream = stream.pipe(unzipper).pipe(dest)
					writeStream.on("finish", resolve)
				})
			}
		}

		await pythonGenerateThumbnails(tempPath || pathToNIFTI, tempNames)
		await processThumbnails(tempNames, outputNames)

		return outputNames
	}
	catch (e) {console.error(pathToNIFTI, e)} //Likely an error in pythonGenerateThumbnails that caused processThumbnails to try to read a nonexistant file (as thumbnails not generated)
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

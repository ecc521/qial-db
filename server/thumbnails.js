const fs = require("fs")
const path = require("path")

const os = require("os")
const child_process = require("child_process")
const zlib = require("zlib")

const sharp = require("sharp")

const generateTiffThumbnails = require("./generateTiffThumbnails.js")

const viewNames = ["x","y","z"]
const finalType = "webp"


//Return generated thumbnails if available.
function accessThumbnails(pathToFile) {
	let outputName = path.basename(pathToFile)

	let outputNames = viewNames.map((view) => {
		return outputName + `.${view}.${finalType}`
	})

	let modifiedFile = fs.statSync(pathToFile).mtime
	if (
		outputNames.every((fileName) => {
			let filePath = path.join(global.thumbnailsDir, fileName)
			if (!fs.existsSync(filePath)) {return false} //Need to regenerate. Doesn't exist.
			let modified = fs.statSync(filePath).mtime
			if (modified < modifiedFile) {return false} //File modified more recently than thumbnail. Thumbnail old.
			return true
		})
	) {
		return outputNames //Cache exists and is new.
	}
	else {
		return false //Need to regenerate.
	}
}


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


//Return generated thumbnails, or create if they don't exist.
async function createThumbnails(pathToFile) {
	let cache = accessThumbnails(pathToFile)
	if (cache) {return cache}

	if (pathToFile.endsWith(".tif") || pathToFile.endsWith(".tiff")) {
		return await generateTiffThumbnails(pathToFile)
	}

	//Temporary names used for not-yet-processed python generated thumbnails.
	const tempNames = viewNames.map((name) => {return name + ".png"})
	let tempPath;
	try {
		//Currently, generateThumbnails.py requires the entire decompressed file to generate thumbnails.
		//Therefore, on systems with little memory, decompress to disk first.

		//This should clean up stuff the next run even if broken GZIP files are left around once. May have one load with extra files.
		if (pathToFile.endsWith(".nii.gz")) {
			if (fs.statSync(pathToFile).size > os.freemem() / 2) {
				console.warn("WRITING TO DISK!!!", pathToFile)
				tempPath = path.join(global.cacheDir, outputName.slice(0, -3))
				let unzipper = zlib.createGunzip()
				await new Promise((resolve, reject) => {
					let stream = fs.createReadStream(pathToFile)
					let dest = fs.createWriteStream(tempPath)
					let writeStream = stream.pipe(unzipper).pipe(dest)
					writeStream.on("finish", resolve)
				})
			}
		}

		await pythonGenerateThumbnails(tempPath || pathToFile, tempNames)
		await processThumbnails(tempNames, outputNames)

		return outputNames
	}
	catch (e) {console.error(pathToFile, e)} //Likely an error in pythonGenerateThumbnails that caused processThumbnails to try to read a nonexistant file (as thumbnails not generated)
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

module.exports = {accessThumbnails, createThumbnails}

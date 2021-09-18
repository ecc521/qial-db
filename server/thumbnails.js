// //thumbnails.js expects the path to be to the image file.
// //The precomputed directory will be looked up for the file.
//
// const fs = require("fs")
// const path = require("path")
//
// const child_process = require("child_process")
//
// const viewNames = ["x","y","z"]
// const finalType = "webp"
//
// function obtainInputPath(src) {
// 	//TODO: Make sure path is for precomputed dir.
// 	let outputName = path.baseName(pathToFile)
// 	return path.join(global.precomputedDir, outputName)
// }
//
// function getOutputNames(pathToFile) {
// 	let outputName = path.basename(pathToFile)
//
// 	return viewNames.map((view) => {
// 		return outputName + `.${view}.${finalType}`
// 	})
// }
//
// //Return generated thumbnails if available.
// function accessThumbnails(pathToFile) {
// 	let outputNames = getOutputNames(pathToFile)
//
// 	let modifiedFile = fs.statSync(pathToFile).mtime
// 	if (
// 		outputNames.every((fileName) => {
// 			let filePath = path.join(global.thumbnailsDir, fileName)
// 			if (!fs.existsSync(filePath)) {return false} //Need to regenerate. Doesn't exist.
// 			let modified = fs.statSync(filePath).mtime
// 			if (modified < modifiedFile) {return false} //File modified more recently than thumbnail. Thumbnail old.
// 			return true
// 		})
// 	) {
// 		return outputNames //Cache exists and is new.
// 	}
// 	else {
// 		return false //Need to regenerate.
// 	}
// }
//
// //Calls python code to generate thumbnails.
// function pythonGenerateThumbnails(pathToPrecomputed, outputNames) {
// 	let process = child_process.spawn("python3", [
// 		path.join(__dirname, "python", "thumbnails.py"),
// 		pathToPrecomputed,
// 	].concat(outputNames), {
// 		cwd: global.thumbnailsDir
// 	})
//
// 	return new Promise((resolve, reject) => {
// 		process.on('close', resolve);
// 	})
// }
//
// //Return generated thumbnails, or create if they don't exist.
// async function createThumbnails(pathToFile) {
// 	let cache = accessThumbnails(pathToFile)
// 	if (cache) {return cache}
//
// 	let outputNames = getOutputNames(pathToFile)
// 	await pythonGenerateThumbnails(obtainInputPath(pathToFile), outputNames)
// 	return outputNames
// }
//
// module.exports = {accessThumbnails, createThumbnails}

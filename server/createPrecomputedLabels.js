const fs = require("fs")
const path = require("path")

const child_process = require("child_process")


//Calls python code to generate labels.
function createPrecomputedLabels(pathToNIFTI) {
	//TODO: Confirm that we actually need to regenerate outputDir.
console.log("Generating " + pathToNIFTI)

	let modifiedNifti = fs.statSync(pathToNIFTI).mtime

	let outputName = path.basename(pathToNIFTI)
	let outputDir = path.join(global.precomputedLabelsDir, outputName)

	if (fs.existsSync(outputDir)) {
		let infoFilePath = path.join(outputDir, "info")
		if (fs.existsSync(infoFilePath)) {
			console.log("Has Both. ")
			let modified = fs.statSync(infoFilePath).mtime

			//Info modified more recently than NITFI. No need to regenerate.
			if (modified > modifiedNifti) {
				console.log("Already Generated and New")
				return true
			}
		}
	}

	console.log("Computing " + pathToNIFTI)


	let process = child_process.spawn("python3", [
		path.join(__dirname, "python", "createPrecomputedLabels.py"),
		pathToNIFTI,
		path.join(global.dataDir, "CHASSSYMM3_to_ABA.xlsx"), //TODO: We need a better way to handle the spreadsheet files.
		outputName //dirName - taken relative to the cwd.
	], {
		cwd: global.precomputedLabelsDir
	})

	return new Promise((resolve, reject) => {
		process.on('close', resolve);
	})
}

module.exports = createPrecomputedLabels

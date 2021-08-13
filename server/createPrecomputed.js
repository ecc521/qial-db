const fs = require("fs")
const path = require("path")

const child_process = require("child_process")


//Calls python code to generate labels.
function createPrecomputed(pathToNIFTI) {
	//TODO: Confirm that we actually need to regenerate outputDir.
	let modifiedNifti = fs.statSync(pathToNIFTI).mtime

	let outputName = path.basename(pathToNIFTI)
	let outputDir = path.join(global.precomputedDir, outputName)

	if (fs.existsSync(outputDir)) {
		let infoFilePath = path.join(outputDir, "info")
		if (fs.existsSync(infoFilePath)) {
			let modified = fs.statSync(infoFilePath).mtime

			//Info modified more recently than NITFI. No need to regenerate.
			if (modified > modifiedNifti) {
				return true
			}
		}
	}
	console.log("Generating", pathToNIFTI)
	let args;
	if (pathToNIFTI.includes("label")) {
		//TODO: Try to rewrite the precomputedLabels code.
		//TODO: We need a better way to handle the spreadsheet files.
		let labelsFileName = "CHASSSYMM3_to_ABA.xlsx"
		let labelsFile = path.join(global.dataDir, labelsFileName)
		if (!fs.existsSync(labelsFile)) {
			console.warn("Unable to compute labels. Missing ", labelsFileName)
			return
		}
		
		args = [
			path.join(__dirname, "python", "createPrecomputedLabels.py"),
			pathToNIFTI,
			labelsFile,
			outputName //dirName - taken relative to the cwd.
		]
	}
	else {
		args = [
			path.join(__dirname, "python", "createPrecomputedNifti.py"),
			pathToNIFTI,
			outputName //dirName - taken relative to the cwd.
		]
	}

	let process = child_process.spawn("python3", args, {
		cwd: global.precomputedDir
	})

	process.stderr.pipe(require("process").stdout)

	return new Promise((resolve, reject) => {
		process.on('close', resolve);
	})
}

module.exports = createPrecomputed

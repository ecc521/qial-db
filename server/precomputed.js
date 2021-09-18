const fs = require("fs")
const path = require("path")

const child_process = require("child_process")

//TODO: We should probably make thumbnails independent of the actual precomputed generation -
//Only regenerate thumbnails, instead of the entire precomputed.
//Since every file for which we can create thumbnails can be turned into a precomputed, we
//can lump the two together, but we should not require regenerating the precomputeds if we change how
//thumbnails are done. 

//Return precomputed directory path if available, else return false.
function accessPrecomputed(pathToFile) {
	let modifiedDate = fs.statSync(pathToFile).mtime

	let outputName = path.basename(pathToFile)
	let outputDir = path.join(global.precomputedDir, outputName)

	if (fs.existsSync(outputDir)) {
		let infoFilePath = path.join(outputDir, "norm.json")
		if (fs.existsSync(infoFilePath)) {
			let modified = fs.statSync(infoFilePath).mtime

			//Info modified more recently than file. No need to regenerate.
			if (modified > modifiedDate) {
				return outputDir
			}
		}
	}
	return false
}


//Return precomputed directory path, generating if necessary.
//Currently assumes file is a NIFTI.
function createPrecomputed(pathToFile) {
	//If results are cached, return them.
	let cache = accessPrecomputed(pathToFile)
	if (cache) {return cache}

	let outputName = path.basename(pathToFile)
	console.log("Generating", pathToFile)

	let args;
	if (pathToFile.includes("label")) {
		//Call python code to generate precomputed labels from NIFTI

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
			pathToFile,
			labelsFile,
			outputName //dirName - taken relative to the cwd.
		]
	}
	else {
		//Call python code to generate precomputed from NIFTI
		args = [
			path.join(__dirname, "python", "createPrecomputedNifti.py"),
			pathToFile,
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


module.exports = {accessPrecomputed, createPrecomputed}

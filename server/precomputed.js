const fs = require("fs")
const path = require("path")

const child_process = require("child_process")


//Return precomputed directory path if available, else return false.
function accessPrecomputed(pathToFile) {
	let modifiedDate = fs.statSync(pathToFile).mtime

	let outputName = path.basename(pathToFile)
	let outputDir = path.join(global.precomputedDir, outputName)

	if (fs.existsSync(outputDir)) {
		let infoFilePath = path.join(outputDir, "info") //The info file is the last thing generated.
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
function createPrecomputed(pathToFile) {
	//If results are cached, return them.
	let cache = accessPrecomputed(pathToFile)
	if (cache) {return cache}

	let outputName = path.basename(pathToFile)
	let outputPath = path.join(global.precomputedDir, outputName)
	console.log("Generating", pathToFile)

	let args = [
		path.join(__dirname, "python", "createPrecomputed.py"),
		pathToFile,
		outputPath
	]

	if (pathToFile.includes("label")) {
		//Add label file path to args.
		//TODO: We need a better way to handle the spreadsheet files.
		let labelsFileName = "CHASSSYMM3_to_ABA.xlsx"
		let labelsFilePath = path.join(global.dataDir, labelsFileName)
		if (fs.existsSync(labelsFilePath)) {
			args.push(labelsFilePath)
		}
		else {
			console.warn("Labels will not be fully computed - missing ", labelsFileName)
		}
	}

	let process = child_process.spawn("python3", args)

	process.stderr.pipe(require("process").stdout)

	return new Promise((resolve, reject) => {
		process.on('close', resolve);
	})
}


module.exports = {accessPrecomputed, createPrecomputed}

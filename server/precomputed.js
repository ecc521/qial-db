import fs from "fs"
import path from "path"
import child_process from "child_process"

function getOutputPath(pathToFile) {
	//Replace name of parent directory with "cache".
	let fileName = path.basename(pathToFile)
	let parentParentDir = path.dirname(path.dirname(pathToFile))
	return path.join(parentParentDir, "cache", "precomputed", fileName)
}

//Return precomputed directory path if available, else return false.
function accessPrecomputed(pathToFile) {
	let modifiedDate = fs.statSync(pathToFile).mtime

	let outputDir = getOutputPath(pathToFile)

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

	let outputDir = getOutputPath(pathToFile)
	console.log("Generating", pathToFile)

	let args = [
		path.join(path.dirname((new URL(import.meta.url)).pathname), "python", "Precomputed"),
		pathToFile,
		outputDir
	]

	//TODO: Handle labels.

	// if (pathToFile.includes("label")) {
	// 	//Add label file path to args.
	// 	//TODO: We need a better way to handle the spreadsheet files.
	// 	let labelsFileName = "CHASSSYMM3_to_ABA.xlsx"
	// 	let labelsFilePath = path.join(global.dataDir, labelsFileName)
	// 	if (fs.existsSync(labelsFilePath)) {
	// 		args.push(labelsFilePath)
	// 	}
	// 	else {
	// 		console.warn("Labels will not be fully computed - missing ", labelsFileName)
	// 	}
	// }

	let spawnedProcess = child_process.spawn("python3", args)

	spawnedProcess.stderr.pipe(process.stdout)

	return new Promise((resolve, reject) => {
		spawnedProcess.on('close', resolve);
	})
}


export {accessPrecomputed, createPrecomputed}

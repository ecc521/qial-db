import * as fs from "fs";
import * as path from "path";

//Used to normalize Animal IDs.
//TODO: We need to figure out what the stuff after the colon means.
//We currently assume it is irrelevant.
function normalizeCode(codeToNormalize = "") {
	codeToNormalize = codeToNormalize.trim()
	if (codeToNormalize.indexOf(":") !== -1) {
		codeToNormalize = codeToNormalize.slice(0, codeToNormalize.indexOf(":"))
	}
	return codeToNormalize.split("-").join("_")
}

//Return the namespace for a XLSX/CSV given it's sheet/file name.
function computeNamespace(name) {
	name = name.toLowerCase()
	//TODO: These namespaces might be contained as part of a word (ex, fa being part of body_fats.csv)
	let namespaces = ["nor", "mwm", "fa", "volume"]
	for (let i=0;i<namespaces.length;i++) {
		let namespace = namespaces[i]
		if (name.includes(namespace)) {
			return namespace
		}
	}
	return
}

function createEmptyAnimal(id) {
	return {
		Animal: id,
		type: "animal",
		views: [],
		componentFiles: []
	}
}

function createFile(fileName, type = "file") {
	let stats = fs.statSync(path.join(global.dataDir, fileName))
	return {
		name: fileName,
		size: stats.size,
		lastModified: new Date(stats.mtime).getTime(),
		type
	}
}

export {createEmptyAnimal, createFile, normalizeCode, computeNamespace}

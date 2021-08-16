const fs = require("fs")
const path = require("path")

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

module.exports = {createEmptyAnimal, createFile, normalizeCode}

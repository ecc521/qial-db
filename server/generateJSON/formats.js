import fs from "fs";
import path from "path";

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

export {normalizeCode, computeNamespace}

import File from "../../lib/File/index.js"
import Scan from "../../lib/Scan/index.js"
import Subject from "../../lib/Subject/index.js"

//Destringify Study.
let contentParsers = {
	"Subjects": Subject,
	"Files": File,
	"Scans": Scan
}

function destringifyStudyContents(contents) {
	for (let [keyInContents, parser] of Object.entries(contentParsers)) {
		let itemMap = new Map()
		for (let [key, value] of Object.entries(contents[keyInContents])) {
			itemMap.set(key, new parser(value))
		}
		contents[keyInContents] = itemMap
	}
	console.log(contents)
	return contents
}

export default destringifyStudyContents

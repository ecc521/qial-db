import fs from "fs";
import path from "path";

import { parse as csvParse} from 'csv-parse/sync';
import xlsx from "xlsx";

import {normalizeCode} from "./formats.js";

let memCache = {}

//processFile loads the files, and parses them. It caches the results, and returns them until the source changes.
function processFile(fileObj, relativeDirectory) {
	if (!fileObj.path.endsWith(".csv") && !fileObj.path.endsWith(".xlsx")) {return false}

	let cached = memCache[fileObj.path]

	//Check lastModified and size, the two properties createFile generates for us.
	if (cached && cached.fileObj.lastModified === fileObj.lastModified && cached.fileObj.size === fileObj.size) {
		return cached
	}

	let sheets = {};
	try {
		let filePath = path.join(relativeDirectory, fileObj.path)
		if (fileObj.path.endsWith(".csv")) {
			let str = fs.readFileSync(filePath)
			let csvData = parseAnimalCSV(str)
			let merged = mergeRowsWithinSheet(csvData)
			sheets[fileObj.path] = merged //Name for sheet is used determining namespace.
		}
		else if (fileObj.path.endsWith(".xlsx")) {
			let file = xlsx.readFileSync(filePath)
			for (let sheetName in file.Sheets) {
				let sheet = file.Sheets[sheetName]
				//This is a bit ineffecient (double parsing), but it works for now.
				let str = xlsx.utils.sheet_to_csv(sheet)
				//Note: We do NOT include the xlsx filename, only the sheet names!
				let csvData = parseAnimalCSV(str)
				let merged = mergeRowsWithinSheet(csvData)
				sheets[sheetName] = merged
			}
		}
	}
	catch (e) {
		//TODO: Nothing useful is done with these currently.
		fileObj.errors = "Not Merged: " + e
	}

	return memCache[fileObj.path] = {fileObj, sheets}
}

function parseAnimalCSV(str) {
	return csvParse(str, {
		 columns: function(header) {
			 return header.map((str) => {
				 str = str.trim()
				 if (str.toLowerCase() === "animal") {
					 str = "Animal"
				 }
				 return str
			 })
		 },
		 group_columns_by_name: true
	 })
}


//Merge all rows corresponding to a single animal within this sheet.
//This ensures that no relevant duplicates are removed - if a property is a duplicate outside the sheet, it is a duplicate.
function mergeRowsWithinSheet(rows) {
	let obj = {}
	rows.forEach((row) => {
		let id = row.Animal
		if (!id) {return}

		let normed = normalizeCode(id)
		delete row.Animal
		let target = obj[normed] = obj[normed] || {Animal: normed}

		//Copy all properties, merging into arrays.
		for (let prop in row) {
			if (prop === "Animal") {continue}
			if (prop === "") {continue} //Don't allow empty properties, as they cause lots of glitches in search code.

			//Even if the target it an empty string, we must still merge. We can't have different length arrays.
			if (target[prop] !== undefined) {
				if (!(target[prop] instanceof Array)) {
					target[prop] = [target[prop]]
				}

				if (row[prop] instanceof Array) {
					target[prop].push(...row[prop])
				}
				else {
					target[prop].push(row[prop])
				}
			}
			else {
				target[prop] = row[prop]
			}
		}
	})

	for (let id in obj) {
		let animal = obj[id]
		for (let prop in animal) {
			//If all the values in an array are identical, reduce to a single value.
			if (animal[prop] instanceof Array) {
				if (animal[prop].every(item => item === animal[prop][0])) {
					animal[prop] = animal[prop][0]
				}
			}

			//Delete empty properties.
			if (animal[prop] === "") {
				delete animal[prop]
			}
		}
	}

	return obj
}

export {parseAnimalCSV, mergeRowsWithinSheet, processFile}

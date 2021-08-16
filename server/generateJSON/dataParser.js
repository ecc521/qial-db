const fs = require("fs")
const path = require("path")

const csvParse = require('csv-parse/lib/sync')
const xlsx = require("xlsx")

const {createEmptyAnimal, createFile, normalizeCode} = require("./formats.js")

let memCache = {
	csv: {},
	xlsx: {}
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
		 columns_duplicates_to_array: true
	 })
}


//Merge all rows corresponding to a single animal within this sheet.
//This ensures that no relevant duplicates are removed - if a property is a duplicate outside the sheet, it is a duplicate.
function mergeRows(rows) {
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

module.exports = {parseAnimalCSV, mergeRows}

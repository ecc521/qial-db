const fs = require("fs")
const path = require("path")

const fetch = require("node-fetch")
const csvParse = require('csv-parse/lib/sync')

let cache;
let lastCached;
//Currently never using cache as useCache is false.
module.exports = async function loadDataCSV(useCache = false, SHEET_NAME="Mice", FILE_ID="1NLrvb5Y61Gcc-02lrkHya-J0M-mYoypGfB6nTZ0QGmU") {
	let url = `https://docs.google.com/spreadsheets/d/${FILE_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`
	let response = await fetch(url)
	let text = (await response.text()).trim()

	if (!cache || !useCache) {
		results = csvParse(text, {
			columns: true,
			columns_duplicates_to_array: true
		})

		//TODO: Process the CSV line by line instead.
		results.forEach((item, index) => {
			item.csvSources = item.csvSources || {}
			let lineNumber = index + 1
			let line = text.split("\n")[lineNumber]

			item.csvSources[SHEET_NAME] = {
				lineNumber,
				//Google Sheets is 1 indexed - add 1.
				editUrl: `https://docs.google.com/spreadsheets/d/${FILE_ID}/#gid=0&range=${lineNumber + 1}:${lineNumber + 1}`
			}
		})

		cache = {csvText: text, json: results}
		lastCached = Date.now()
	}

	return cache
}

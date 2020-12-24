const fs = require("fs")
const path = require("path")

const fetch = require("node-fetch")
const csvParser = require("csv-parser")

let cache;
let lastCached;
module.exports = async function loadDataCSV(useCache = false, SHEET_NAME="Mice", FILE_ID="1NLrvb5Y61Gcc-02lrkHya-J0M-mYoypGfB6nTZ0QGmU") {
	let url = `https://docs.google.com/spreadsheets/d/${FILE_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`
	let response = await fetch(url)

	if (!cache || !useCache) {
		let results = await new Promise((resolve, reject) => {
			let results = []
			response.body.pipe(csvParser())
			  .on('data', (data) => {results.push(data)})
			  .on('end', () => {
				resolve(results)
			  });
		})
		cache = results
		lastCached = Date.now()
	}

	return cache
}

const fs = require("fs")
const path = require("path")
const csvParser = require("csv-parser")

let cache;
let lastCached;
module.exports = async function loadDataCSV(filePath = path.join(__dirname, "../", "data", "QCLAB_AD_mice.csv")) {
	//If in cache, and was last cached more recently than the file changed, then don't bother processing.
	if (!(cache && lastCached > fs.statSync(filePath).mtime)) {
		let results = await new Promise((resolve, reject) => {
			let results = []
			fs.createReadStream(filePath)
			  .pipe(csvParser())
			  .on('data', (data) => results.push(data))
			  .on('end', () => {
				resolve(results)
			  });
		})

		cache = results
		lastCached = Date.now()
	}
	return cache
}

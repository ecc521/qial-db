const fs = require("fs")
const path = require("path")

import fetch from 'node-fetch';

let cache;
let lastCached;
//Currently never using cache as useCache is false.
module.exports = async function loadDataCSV(useCache = false, SHEET_NAME="Mice", FILE_ID="1NLrvb5Y61Gcc-02lrkHya-J0M-mYoypGfB6nTZ0QGmU") {
	let url = `https://docs.google.com/spreadsheets/d/${FILE_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`
	let response = await fetch(url)
	let text = (await response.text()).trim()

	return text
}

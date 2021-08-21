let getDownloadTemplate = require("./getDownloadTemplate.js")

let downloadMenuDiv = document.createElement("div")
document.body.appendChild(downloadMenuDiv)

let downloadInfo = document.createElement("p")
downloadMenuDiv.appendChild(downloadInfo)

let downloadZip = document.createElement("button")
downloadZip.innerHTML = "Download ZIP"
downloadMenuDiv.appendChild(downloadZip)

let downloadNodejsScript = document.createElement("button")
downloadNodejsScript.innerHTML = "Download NodeJS Script"
downloadMenuDiv.appendChild(downloadNodejsScript)

downloadMenuDiv.appendChild(document.createElement("br"))
downloadMenuDiv.appendChild(document.createElement("br"))
let downloadFullJSON = document.createElement("button")
downloadMenuDiv.appendChild(downloadFullJSON)

let downloadFullCSV = document.createElement("button")
downloadMenuDiv.appendChild(downloadFullCSV)

downloadMenuDiv.appendChild(document.createElement("br"))
let downloadSelectedJSON = document.createElement("button")
downloadMenuDiv.appendChild(downloadSelectedJSON)

let downloadSelectedCSV = document.createElement("button")
downloadMenuDiv.appendChild(downloadSelectedCSV)

downloadMenuAdditionalInfo = document.createElement("p")
downloadMenuAdditionalInfo.innerHTML += `
<h3>ZIP file Download: </h3>
<p> - Recommended for smaller downloads. Downloads over ~5GB should probably use a script, to allow for pause and resume, and to avoid a potential download failure with network fluctuations. </p>

<h3>NodeJS script Download (<a target="_blank" href="https://nodejs.org">install NodeJS</a>): </h3>
<p> - Script is auto-generated for the files you have selected. Just run it with node. </p>
<p> - Script can be terminated at any time. Re-running the script will perform clean up, and download remaining files. </p>
<p> - Prompts for a relative directory to download into, else downloads to the current directory. No existing files will be overwritten. </p>
<br>`
downloadMenuDiv.appendChild(downloadMenuAdditionalInfo)

let closeInstructions = document.createElement("p")
closeInstructions.innerHTML = `To close this popup, click on the darkened area outside the popup, or use the "Close Download Menu" button on the bar at the bottom of the page.`
downloadMenuDiv.appendChild(closeInstructions)

downloadMenuDiv.remove()

let downloadMenu = new window.Overlay()

let toggleDownload = document.getElementById("toggleDownload")
toggleDownload.addEventListener("click", function() {
	function hide() {
		downloadMenu.hide()
		toggleDownload.innerHTML = "Open Download Menu"
	}
	if (downloadMenu.hidden === true) {
		downloadMenu.show(downloadMenuDiv, hide)
		toggleDownload.innerHTML = "Close Download Menu"
	}
	else {
		hide()
	}
})

function downloadFile(name, text) {
	var link = document.createElement("a");
	document.body.appendChild(link);

	link.download = name
	let blob = new Blob([text])
	link.href = URL.createObjectURL(blob);
	link.click();

	document.body.removeChild(link);
	URL.revokeObjectURL(link.href)
}

function getFullJSONMetadata() {
	return JSON.stringify(window.data, null, "\t")
}

downloadFullJSON.addEventListener("click", function() {
	downloadFile("metadata.json", getFullJSONMetadata())
})

function getSelectionJSONMetadata() {
	let itemsSelected = parentHolder.filter((item) => {
		if (!item.checkbox.checked) {return false}
		return true
	}).map((item) => {return item.item})
	return JSON.stringify(itemsSelected, null, "\t")
}

downloadSelectedJSON.addEventListener("click", function() {
	downloadFile("selectedmetadata.json", getSelectionJSONMetadata())
})

function getAllProperties(items) {
	//Returns a list of all the column names - used to determine the header for the CSV.
	//Note that if a field contains arrays, we need to return enough copies of the column name for EVERY item to fit.
	let props = new Map()
	items.forEach((item) => {
		Object.keys(item).forEach((key) => {
			let currentAmount = props.get(key)

			let itemVal = item[key]

			if (itemVal instanceof Array) {
				if (typeof itemVal[0] === "string" || typeof itemVal[0] === "number") {
					//Ignore any arrays of Objects, etc.
					//Also ensures that 0 length arrays can't happen, though I suspect they are filtered out MUCH earlier anyways.
					props.set(key, Math.max(itemVal.length, currentAmount || 0))
				}
			}
			else if (currentAmount === undefined) {
				if (typeof itemVal === "string" || typeof itemVal === "number") {
					props.set(key, 1)
				}
			}
		})
	})

	return Array.from(props) //Returns an associative array - [[propertyName, numberOfTimes], [propertyName, numberOfTimes]]
}

function createCSV(items) {
	//Based off the rules at https://www.freeformatter.com/csv-escape.html
	//It appears there are two different ways of escaping things, several cases where escapes aren't technically needed.
	//That said, we should err on the side of escaping too often. It doesn't do much harm.
	//We may not even need to escape given current data, but it should absolutely be built in.

	//TODO: This code needs redoing for associative arrays.

	let str = ""

	function escapeForCSV(str = "") {
		//Escape using double quotes.
		if (typeof str === "number") {str = String(str)}
		if (str.includes(",") || str.includes("\n") || str.includes('"')) {
			str = `"${str.replace('"', '""')}"`
		}
		return str
	}

	let props = getAllProperties(items)
	props.forEach((assocArr, propIndex) => {
		let prop = assocArr[0]
		for (let i=0;i<assocArr[1];i++) {
			if (propIndex !== 0 || i !== 0) {str += ","}
			str += escapeForCSV(prop)
		}
	})

	items.forEach((item) => {
		str += "\n"
		props.forEach((assocArr, propIndex) => {
			let prop = assocArr[0]
			let amount = assocArr[1]

			let val = item[prop]
			if (propIndex !== 0) {str += ","}

			if (amount === 1) {
				str += escapeForCSV(val)
			}
			else {
				if (!(val instanceof Array)) {
					val = [val]
				}

				for (let i=0;i < amount;i++) {
					if (i !== 0) {str += ","}
					str += escapeForCSV(val[i])
				}
			}
		})
	})

	return str
}

function getFullCSVMetadata() {
 	return createCSV(window.data)
}

downloadFullCSV.addEventListener("click", function() {
	downloadFile("fullmetadata.csv", getFullCSVMetadata())
})

function getSelectionCSVMetadata() {
	let itemsSelected = parentHolder.filter((item) => {
		if (!item.checkbox.checked) {return false}
		return true
	}).map((item) => {return item.item})

	console.log(itemsSelected)

	return createCSV(itemsSelected)
}

downloadSelectedCSV.addEventListener("click", function() {
	downloadFile("selectedmetadata.csv", getSelectionCSVMetadata())
})

function offerAdditionalFiles() {
	downloadFullJSON.innerHTML = `Download JSON Metadata File (${numberPrettyBytesSI(getFullJSONMetadata().length)})`
	downloadSelectedJSON.innerHTML = `Download JSON Metadata for Selection (${numberPrettyBytesSI(getSelectionJSONMetadata().length)})`
	downloadFullCSV.innerHTML = `Download CSV Metadata File (${numberPrettyBytesSI(getFullCSVMetadata().length)})`
	downloadSelectedCSV.innerHTML = `Download CSV Metadata for Selection (${numberPrettyBytesSI(getSelectionCSVMetadata().length)})`
}

function getDownloadData() {
	offerAdditionalFiles()

	let items = itemHolder.filter((item) => {return item.checkbox.checked})
	items = items.map((item) => {return item.item})

	let totalSize = items.reduce((sum, item) => {return sum + item.size}, 0)

	downloadInfo.innerHTML = `You have selected ${items.length} files totalling ${numberPrettyBytesSI(totalSize)}. `

	return items
}
toggleDownload.addEventListener("click", getDownloadData)
window.addEventListener("bulkSelectionUsed", getDownloadData)

downloadZip.addEventListener("click", function() {
	let items = getDownloadData()
	if (items.length === 0) {return alert("Please exit the download menu and select some items to download. ")}

	let names = items.map((item) => {
		return item.name
	})

	let form = document.createElement("form")
	form.setAttribute("method", "post")
	form.setAttribute("action", "download")
	form.style.display = "none"

	let field = document.createElement("input")
	field.setAttribute("name", "names")
	field.setAttribute("value", names.join(","))
	form.appendChild(field)

	document.body.appendChild(form)
	form.submit()
	form.remove()
})

downloadNodejsScript.addEventListener("click", function() {
	let items = getDownloadData()
	if (items.length === 0) {return alert("Please exit the download menu and select some items to download. ")}

	let urls = items.map((item) => {
		return `${window.location.origin}/data/${item.name}`
	})
	let str = getDownloadTemplate(urls)

	downloadFile("qialdownload.js", str)
})

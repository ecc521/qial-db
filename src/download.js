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

let ftpUrl = new URL(window.location)
ftpUrl.protocol = "ftp"
ftpUrl.port = 21

downloadMenuAdditionalInfo = document.createElement("p")
downloadMenuAdditionalInfo.innerHTML += `
<p>Qial-DB FTP Server (read-only) is located at <a href="${ftpUrl.href}" target="_blank">${ftpUrl.href}</a>. Connect as a guest/anonymous. Downloads not compressed, and not yet encrypted. </p>

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

function getFullCSVMetadata() {
	return window.csvSources["Mice"]
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

	let csvLines = window.csvSources["Mice"].split("\n")
	let output = csvLines[0]

	itemsSelected.forEach((item) => {
		if (item?.csvSources?.["Mice"].lineNumber) {
			output += "\n" + csvLines[item?.csvSources?.["Mice"].lineNumber]
		}
	})
	return output
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
		return window.location.href + "data/" + item.name
	})
	let str = getDownloadTemplate(urls)

	downloadFile("qialdownload.js", str)
})

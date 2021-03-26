let getDownloadTemplate = require("./getDownloadTemplate.js")

function addCheckbox(container, labelText, selected = false) {
	let label = document.createElement("label")
	label.innerHTML = labelText

	let checkbox = document.createElement("input")
	checkbox.type = "checkbox"
	checkbox.selected = selected

	container.appendChild(checkbox)
	container.appendChild(label)
	container.appendChild(document.createElement("br"))

	label.addEventListener("click", function() {checkbox.click()})
	return checkbox
}

let downloadMenuDiv = document.getElementById("downloadMenu")

let includeFullJSON = addCheckbox(downloadMenuDiv, "Include Full JSON Data File")
let includeSelectedJSON = addCheckbox(downloadMenuDiv, "Download JSON Data for Selection")

downloadMenuDiv.appendChild(document.createElement("br"))

let downloadZip = document.createElement("button")
downloadZip.innerHTML = "Download ZIP"
downloadMenuDiv.appendChild(downloadZip)

let downloadNodejsScript = document.createElement("button")
downloadNodejsScript.innerHTML = "Download NodeJS Script"
downloadMenuDiv.appendChild(downloadNodejsScript)

let downloadInfo = document.createElement("p")
downloadMenuDiv.appendChild(downloadInfo)

downloadMenuDiv.innerHTML += `
<br><h3>ZIP file Download: </h3>
<p> - Recommended for smaller downloads. Downloads over ~5GB should probably use a script, to allow for pause and resume, and to avoid a potential download failure with network fluctuations. </p>

<h3>NodeJS script Download (<a target="_blank" href="https://nodejs.org">install NodeJS</a>): </h3>
<p> - Script is auto-generated for the files you have selected. Just run it with node. </p>
<p> - Script can be terminated at any time. Re-running the script will perform clean up, and download remaining files. </p>
<p> - Prompts for a relative directory to download into, else downloads to the current directory. No existing files will be overwritten. </p>
<br>`

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
		downloadMenu.show(downloadMenuDiv, false, hide)
		toggleDownload.innerHTML = "Close Download Menu"
	}
	else {
		hide()
	}
})

function getDownloadData() {
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
	form.setAttribute("action", window.url + "download")
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
	var link = document.createElement("a");
	document.body.appendChild(link);

	link.download = "qialdownload.js"
	let items = getDownloadData()
	if (items.length === 0) {return alert("Please exit the download menu and select some items to download. ")}

	let urls = items.map((item) => {
		return window.location.href + "data/" + item.name
	})
	let template = getDownloadTemplate(urls)
	let blob = new Blob([template])
	link.href = URL.createObjectURL(blob);
	link.click();

	document.body.removeChild(link);
	URL.revokeObjectURL(link.href)
})

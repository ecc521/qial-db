let getDownloadTemplate = require("./getDownloadTemplate.js")

let downloadMenuDiv = document.getElementById("downloadMenu")
let downloadNodejsScript = document.getElementById("downloadNodejsScript")
let downloadZip = document.getElementById("downloadZip")
let downloadInfo = document.getElementById("downloadInfo")

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

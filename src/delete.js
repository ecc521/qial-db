let menuDiv = document.getElementById("deleteMenuDiv")
let info = document.getElementById("deleteInfo")
let results = document.getElementById("deleteResuts")
let deleteButton = document.getElementById("deleteButton")

menuDiv.remove()

let menu = new window.Overlay()
let passwordInput;

let toggleButton = document.getElementById("toggleDelete")
toggleButton.addEventListener("click", function() {
	function hide() {
		menu.hide()
		toggleButton.innerHTML = "Open Delete Menu"
	}
	if (menu.hidden === true) {
		passwordInput = menu.show(menuDiv, true, hide)
		toggleButton.innerHTML = "Close Delete Menu"
	}
	else {
		hide()
	}
})

//TODO: Dedupe this with download.js
function getDownloadData() {
	let items = itemHolder.filter((item) => {return item.checkbox.checked})
	items = items.map((item) => {return item.item})

	let totalSize = items.reduce((sum, item) => {return sum + item.size}, 0)

	info.innerHTML = `You have selected ${items.length} files totalling ${numberPrettyBytesSI(totalSize)}. `
	return items
}
toggleButton.addEventListener("click", getDownloadData)
window.addEventListener("bulkSelectionUsed", getDownloadData)


deleteButton.addEventListener("click", async function() {
	let items = getDownloadData()
	if (items.length === 0) {return alert("Please exit the download menu and select some items. ")}

	let names = items.map((item) => {
		return item.name
	})

	if (
		confirm("Are you sure you want to delete " + items.length + " files?")
		&& confirm("Are you ABSOLUTELY SURE you want to delete " + items.length + " files? (This can't be undone)")
	) {
		//Note - right now the server only allows us to delete one file per request.
		results.innerHTML = "Results will appear below: <br>"

		for (var i = 0; i < names.length; i++) {
			let request = await fetch(url + "fileops", {
				method: 'DELETE',
				headers: {
					'qial-password': passwordInput.value,
					'qial-filename': names[i],
				},
			})
			let response = await request.text()
			results.innerHTML += response + "<br>"
		}

		console.log(items)
	}
})

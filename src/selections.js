let selectAll = document.getElementById("selectAll")
let deselectAll = document.getElementById("deselectAll")

function setAll(selected = true) {
	parentHolder.forEach((item) => {
		item.checkbox.checked = !selected
		item.checkbox.click()
	})
}

selectAll.addEventListener("click", function() {
	setAll()
	window.dispatchEvent(new Event("bulkSelectionUsed"))
})

deselectAll.addEventListener("click", function() {
	setAll(false)
	window.dispatchEvent(new Event("bulkSelectionUsed"))
})

let selectAll = document.getElementById("selectAll")
let deselectAll = document.getElementById("deselectAll")

function setAll(selected = true) {
	itemHolder.forEach((child) => {
		if (child.parent) {
			//Trigger hide/show behavior.
			child.parent.checkbox.checked = !selected
			child.parent.checkbox.click()
		}
		child.checkbox.checked = selected
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

function createModal(content) {
	//Create the modal element
	let overview_modal = document.createElement("div")
	overview_modal.className = "modal"

	let modal_content = document.createElement("div")
	modal_content.className = "modal-content"

	let overview_modal_close = document.createElement("span")
	overview_modal_close.className = "modal-close"
	overview_modal_close.innerHTML = "×"

	overview_modal.appendChild(modal_content)
	modal_content.appendChild(overview_modal_close)
	modal_content.appendChild(content)

	document.body.appendChild(overview_modal)

	//Make the modal disappear when the close button is clicked, or when area outside content is clicked
	overview_modal_close.onclick = function() {
		overview_modal.remove()
	}

	window.addEventListener("click", function(event) {
		if (event.target === overview_modal) {
			overview_modal.remove()
		}
	})

	return overview_modal
}


export default createModal

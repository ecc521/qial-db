let overlayClassInstances = [] //Potential memory leak, so we need to make sure Overlays are NEVER dynamically created.

export default class Overlay {
	constructor() {
		this.overlay = document.createElement("div")
		this.overlay.className = "overlay"
		this.center = document.createElement("div")
		this.center.className = "overlayCenter"

		this.overlay.appendChild(this.center)
		overlayClassInstances.push(this)

		this.hidden = true
		this.hideCallback = null
	}

	show(content, hideCallback) {
		overlayClassInstances.forEach((overlayClassInstance) => {
			overlayClassInstance.hide()
		})
		document.body.appendChild(this.overlay)

		this.overlay.onclick = (function(e) {
			//Hide when the outside of the overlay is clicked.
			if (e.target === this.overlay) {
				this.hide()
			}
		}).bind(this)

		if (content) {
			this.center.appendChild(content)
		}
		this.hidden = false
		if (hideCallback) {
			this.hideCallback = hideCallback
		}
	}

	hide() {
		if (this.hidden === false) {
			this.hidden = true
			this.overlay.onclick = undefined
			this.overlay.remove()
			if (this.hideCallback) {this.hideCallback()}
		}
	}
}

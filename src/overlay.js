let authMenu = document.getElementById("authMenu")

let passwordInput = document.getElementById("password")
let togglePassword = document.getElementById("togglepassword")
togglePassword.addEventListener("click", function() {
	if (passwordInput.type === "password") {
		passwordInput.type = "text"
		togglePassword.innerHTML = "Hide Password"
	}
	else {
		passwordInput.type = "password"
		togglePassword.innerHTML = "Show Password"
	}
})

authMenu.remove()


let overlayClassInstances = [] //Potential memory leak, so we need to make sure Overlays are NEVER dynamically created.

module.exports = class Overlay {
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

	show(content, includePassword = true, hideCallback) {
		overlayClassInstances.forEach((overlayClassInstance) => {
			overlayClassInstance.hide()
		})
		document.body.appendChild(this.overlay)
		if (includePassword) {
			this.center.appendChild(authMenu)
		}
		if (content) {
			this.center.appendChild(content)
		}
		this.hidden = false
		if (hideCallback) {
			this.hideCallback = hideCallback
		}
		return passwordInput
	}

	hide() {
		if (this.hidden === false) {
			this.hidden = true
			this.overlay.remove()
			if (this.hideCallback) {this.hideCallback()}
		}
	}
}

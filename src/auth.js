let userCard = document.getElementById("userCard")

function openLoginMenu() {
	window.open("login")
}

function openLogoutMenu() {
	window.open("logout")
}

async function syncUserDetails() {
	let req = await fetch("user")
	let resp = await req.text()

	userCard.removeEventListener("click", openLoginMenu)
	userCard.removeEventListener("click", openLogoutMenu)

	if (resp.length > 0) {
		let obj = JSON.parse(resp)
		userCard.innerHTML = "Log Out " + obj.Name
		userCard.addEventListener("click", openLogoutMenu)
	}
	else {
		userCard.innerHTML = "Log In"
		userCard.addEventListener("click", openLoginMenu)
	}
}

syncUserDetails()

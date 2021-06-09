let userCard = document.getElementById("userCard")
let userDetails;

let accountPopup = document.createElement("iframe")
accountPopup.className = "accountPopup"
document.body.appendChild(accountPopup)

userCard.addEventListener("click", function() {
	if (accountPopup.classList.contains("accountPopupExpanded")) {
		accountPopup.classList.remove("accountPopupExpanded")
	}
	else {
		accountPopup.classList.add("accountPopupExpanded")
	}
})

let accountMenu = document.createElement("div")

function openLoginMenu() {
	accountPopup.src = "login"
}

function openAccountMenu() {
	accountPopup.src = "account"
}

async function syncUserDetails() {
	let req = await fetch("user")
	let resp = await req.text()

	userCard.removeEventListener("click", openLoginMenu)
	userCard.removeEventListener("click", openAccountMenu)

	if (resp.length > 0) {
		userDetails = JSON.parse(resp)
		userCard.innerHTML = userDetails.Name
		userCard.addEventListener("click", openAccountMenu)
	}
	else {
		userCard.innerHTML = "Log In"
		userCard.addEventListener("click", openLoginMenu)
	}
}

syncUserDetails()
accountPopup.addEventListener("load", syncUserDetails)

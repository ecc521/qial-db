import * as firebaseui from 'firebaseui'

export default function initAuthUI() {
	// Initialize the FirebaseUI Widget using Firebase.
	let ui = new firebaseui.auth.AuthUI(firebase.auth());

	let uiConfig = {
	  callbacks: {
	    signInSuccessWithAuthResult: function(authResult, redirectUrl) {
	      return false;
	    },
	  },
	  signInFlow: 'popup',
	  signInOptions: [
	    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
	    {
			provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
			requiredDisplayName: false,
		},
	  ],
	};


	let userCard = document.getElementById("userCard") //Log In/User Name button - opens accountPopup.

	let accountPopup = document.createElement("div")
	accountPopup.className = "accountPopup"

	let signInContainer = document.createElement("div")
	accountPopup.appendChild(signInContainer)

	document.body.appendChild(accountPopup)

	function isExpanded() {
		return accountPopup.classList.contains("accountPopupExpanded")
	}

	function hide() {
		accountPopup.classList.remove("accountPopupExpanded")
	}

	function show() {
		accountPopup.classList.add("accountPopupExpanded")
	}

	userCard.addEventListener("click", function() {
		if (isExpanded()) {hide()}
		else {show()}
	})

	document.body.addEventListener("click", function(e) {
		if (!(
			e.path.includes(userCard)
			|| e.path.includes(accountPopup)
		)) {
			hide()
		}
	})

	let manageAccountContainer = document.createElement("div")
	accountPopup.appendChild(manageAccountContainer)

	let accountDetails = document.createElement("p")
	manageAccountContainer.appendChild(accountDetails)

	let signOutButton = document.createElement("button")
	signOutButton.innerHTML = "Sign Out"
	signOutButton.addEventListener("click", function() {
	    firebase.auth().signOut()
	})
	manageAccountContainer.appendChild(signOutButton)

	manageAccountContainer.appendChild(document.createElement("br"))
	manageAccountContainer.appendChild(document.createElement("br"))


	let passwordManagementDiv = document.createElement("div")
	manageAccountContainer.appendChild(passwordManagementDiv)

	let passwordManagementText = document.createElement("p")
	passwordManagementDiv.appendChild(passwordManagementText)
	passwordManagementText.innerHTML = "Passwords are not required to log in through OAuth providers, however allow for an additional method of sign in. "

	let passwordEntryField = document.createElement("input")
	passwordEntryField.placeholder = "Enter New Password..."
	passwordEntryField.type = "password"
	passwordManagementDiv.appendChild(passwordEntryField)

	let togglePasswordVisibility = document.createElement("button")
	togglePasswordVisibility.innerHTML = "Show"

	togglePasswordVisibility.addEventListener("click", function() {
		if (passwordEntryField.type === "password") {
			togglePasswordVisibility.innerHTML = "Hide"
			passwordEntryField.type = "text"
		}
		else {
			togglePasswordVisibility.innerHTML = "Show"
			passwordEntryField.type = "password"
		}
	})
	passwordManagementDiv.appendChild(togglePasswordVisibility)
	passwordManagementDiv.appendChild(document.createElement("br"))

	let setPasswordButton = document.createElement("button")
	setPasswordButton.innerHTML = "Set Password"
	setPasswordButton.addEventListener("click", async function() {
	    if (passwordEntryField.value.length === 0) {return} //Firebase accepts a blank string as a password - though it then throws internal auth errors, so it may be equivalent to disabling passwords.
	    await updatePassword(passwordEntryField.value)
	})
	passwordManagementDiv.appendChild(setPasswordButton)

	async function updatePassword(newPassword) {
		try {
			await firebase.auth().currentUser.updatePassword(newPassword)
			alert("Password Updated!")
		}
		catch (e) {
			if (e.code === "auth/requires-recent-login") {
				alert("You must sign in again before you can set your password. ")
				signInContainer.style.display = ""
			}
			else {
				alert(e.message)
				throw e
			}
		}
	}


	firebase.auth().onAuthStateChanged(function updateLoginUI() {
		let user = firebase.auth().currentUser

		if (!user) {
			userCard.innerHTML = "Log In"
			ui.start(signInContainer, uiConfig);
			signInContainer.style.display = ""
	        manageAccountContainer.style.display = "none"
		}
		else {
			userCard.innerHTML = user.email?.split("@")?.[0]
			signInContainer.style.display = "none"

	        let hasPassword = user.providerData?.some((provider) => {return provider.providerId === "password"})

	        accountDetails.innerHTML =
	`
	Email: ${user.email}
	Has Password: ${hasPassword}
	`
	        //TODO: Add permissions. Need to adjust firebase to allow read only access to users own permissions.

	        manageAccountContainer.style.display = ""
		}
	})
}

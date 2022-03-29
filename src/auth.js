//We need to use the compat API currently, as firebaseui doesn't support the real v9.
import firebase from 'firebase/compat/app';
import * as firebaseui from 'firebaseui'


window.firebase = firebase

const firebaseConfig = {
  apiKey: "AIzaSyDgQ3t1Xw5E8b-FB8POa6n63g4x1w9GQmM",
  authDomain: "qial-db.firebaseapp.com",
  projectId: "qial-db",
  storageBucket: "qial-db.appspot.com",
  messagingSenderId: "57090525212",
  appId: "1:57090525212:web:0f537b263d7cb2cf7937d9",
  measurementId: "G-KHD0TKRK31"
};

firebase.initializeApp(firebaseConfig)

// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());
window.ui = ui

var uiConfig = {
  callbacks: {
    signInSuccessWithAuthResult: function(authResult, redirectUrl) {
      return false;
    },
  },
  signInFlow: 'popup',
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    // firebase.auth.GithubAuthProvider.PROVIDER_ID,
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







firebase.auth().onAuthStateChanged(function updateLoginUI() {
	let user = firebase.auth().currentUser

	if (!user) {
		userCard.innerHTML = "Log In"
		ui.start(signInContainer, uiConfig);
		signInContainer.style.display = ""
	}
	else {
		userCard.innerHTML = user.email?.split("@")?.[0]
		signInContainer.style.display = "none"
	}
})






//
//
// let userDetails;
// let accountMenu = document.createElement("div")
//
// async function syncUserDetails() {
// 	let req = await fetch("user")
// 	let resp = await req.text()
//
// 	userCard.removeEventListener("click", openLoginMenu)
// 	userCard.removeEventListener("click", openAccountMenu)
//
// 	if (resp.length > 0) {
// 		userDetails = JSON.parse(resp)
// 		userCard.innerHTML = userDetails.Name
// 		userCard.addEventListener("click", openAccountMenu)
// 	}
// 	else {
// 		userCard.innerHTML = "Log In"
// 		userCard.addEventListener("click", openLoginMenu)
// 	}
// }
//
// syncUserDetails()
// accountPopup.addEventListener("load", syncUserDetails)
//
// document.addEventListener("click", function(e) {
// 	if (e.target !== accountPopup && e.target !== userCard) {
// 		hide()
// 	}
// })

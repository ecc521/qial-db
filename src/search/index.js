//Load search query from URL.
//Format:
//studyID: string
//search: Search params within study.

let searchLinkToStudy = document.getElementById("searchLinkToStudy")
let searchLinkToSearch = document.getElementById("searchLinkToSearch")

window.searchQuery = new URLSearchParams(window.location.hash.slice(1)) //Used to keep currentViewLink in sync between search.js and graphs.js
//window.currentStudy

let oldSet = window.searchQuery.set
window.searchQuery.set = (function(...args) {
	oldSet.call(this, ...args)
	window.dispatchEvent(new Event("searchQueryChanged"))

	let currentStudyID = window.searchQuery.get("studyID")

	let studyLinkOnly = new URLSearchParams()
	studyLinkOnly.set("studyID", currentStudyID)

	//StudyID is always "null" or a real study ID.
	searchLinkToStudy.style.display = (currentStudyID === "null") ? "none" : "";
	searchLinkToStudy.innerHTML = "Link to Current Study"
	searchLinkToStudy.href = `#${studyLinkOnly}`

	searchLinkToSearch.innerHTML = "Search Link to Current View"
	searchLinkToSearch.href = `#${window.searchQuery}`
}).bind(window.searchQuery)

window.dispatchEvent(new Event("searchQueryChanged"))

import("./studySelection.js") //Needs global variable defined.
import("./search.js")

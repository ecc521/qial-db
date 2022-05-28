//Load search query from URL.
//Format:
//studyID: string
//search: Search params within study.

window.searchQuery = new URLSearchParams(window.location.hash.slice(1)) //Used to keep currentViewLink in sync between search.js and graphs.js
//window.currentStudy

let oldSet = window.searchQuery.set
window.searchQuery.set = (function(...args) {
	let oldValue = String(this)
	oldSet.call(this, ...args)
	let newValue = String(this)
	if (oldValue !== newValue) {
		//Only dispatch if the values changed to prevent infinite loops.
		window.dispatchEvent(new Event("searchQueryChanged"))
	}
}).bind(window.searchQuery)

window.dispatchEvent(new Event("searchQueryChanged"))

import("./studySelection.js") //Needs global variable defined.
import("./search.js")
import("../graphs.js")

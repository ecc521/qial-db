/**
 * Manages study selection and renders study selection UI.
 * Study cards will initially be rendered fully expanded, then shrunk down to just display name and ID when selected.
 * So the study selector is behind a collapsing accordian.
 * There will also be an option to Create New Study, which will open up a Study Creator page.
 */

 import {openStudyMetadataEditor, saveStudyToServer} from "./studyManager.js"

 let studies;

//Accordian UI and currently selected study name.
let studySelectAccordian = document.getElementById("studySelectAccordian")

//Container for actual selector.
let studySelectContainer = document.getElementById("studySelectContainer")


let accordianOpenClass = "is-open"
function closeAccordian() {
	studySelectAccordian.classList.remove(accordianOpenClass);
	studySelectContainer.style.maxHeight = null;
}

function openAccordian() {
	studySelectAccordian.classList.add(accordianOpenClass);
	studySelectContainer.style.maxHeight = studySelectContainer.scrollHeight + "px";
}

function toggleAccordian() {
	if (studySelectAccordian.classList.contains(accordianOpenClass)) {
		closeAccordian()
	}
	else {
		openAccordian()
	}
}
studySelectAccordian.addEventListener("click", toggleAccordian)

let studySelectionOptions = document.getElementById("studySelectOptions")

function createCard(titleText, bodyText, listener) {
	let card = document.createElement("div")
	card.classList.add("card")

	let contentsContainer = document.createElement("div")

	let title = document.createElement("p")
	title.classList.add("cardTitle")
	title.innerText = titleText

	let description = document.createElement("p")
	title.classList.add("cardDescription")
	description.innerText = bodyText

	card.appendChild(contentsContainer)
	contentsContainer.appendChild(title)
	contentsContainer.appendChild(description)

	return card
}

function prepareStudies() {
	//Clear the old cards.
	let cards = studySelectionOptions.querySelectorAll(".card")
	for (let card of cards) {
		card.remove()
	}

	for (let study of studies) {
		console.log(study)
		let cardTitle = `${study.name || "Study"} (ID: ${study.ID})`
		let cardDescription = study.description || "No Description Available. "

		let card = createCard(cardTitle, cardDescription)

		card.addEventListener("click", function() {
			setSelectedStudy(study.ID)
		})

		let editButton = document.createElement("img")
		editButton.src = "assets/edit.svg"
		editButton.classList.add("cardEditIcon")
		editButton.addEventListener("click", function(e) {
			openStudyMetadataEditor(study, refreshStudies)
			e.stopPropagation()
		})
		card.appendChild(editButton)

		studySelectionOptions.appendChild(card)
	}

	//Add the create study card at the bottom.
	//TODO: It should check user permissions somewhere so we don't end up with a server side rejection late in the process.

	let createNewStudy = createCard("New Study", "Create a new study. ")
	createNewStudy.addEventListener("click", function() {
		openStudyMetadataEditor({}, refreshStudies)
	})
	studySelectionOptions.appendChild(createNewStudy)
}




async function refreshStudies() {
	let studyRequest = await fetch("studies?type=list")
	studies = await studyRequest.json()
	prepareStudies()
}

function setSelectedStudy(studyID) {
	console.log(studyID)
	console.log(studies)
	window.searchQuery.set("studyID", studyID)
	if (studies[studyID]) {
		closeAccordian()
	}
	else {
		openAccordian()
	}
}

;(async function init() {
	await refreshStudies()
	setSelectedStudy(window.searchQuery.get("studyID"))
}())






function createStudy() {

}

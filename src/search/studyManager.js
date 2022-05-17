/**
 * Handles the UI to edit/create a new study.
*/
import createModal from "../createModal.js"


/**
 * Metadata editor for studies. Calls callback once changes saved to server.
*/
async function openStudyMetadataEditor({
	ID = "",
	name = "",
	description = ""
}, callback) {
	let container = document.createElement("div")
	container.classList.add("studyMetadataEditor")

	let IDLabel = document.createElement("label")
	IDLabel.innerHTML = `Study ID: ${ID ? ID : "Will be assigned"}`
	IDLabel.style.display = "block"
	container.appendChild(IDLabel)

	let nameLabel = document.createElement("label")
	nameLabel.innerHTML = "Study Name: "
	container.appendChild(nameLabel)

	let nameInput = document.createElement("input")
	nameInput.value = name
	container.appendChild(nameInput)

	let descriptionLabel = document.createElement("label")
	descriptionLabel.innerHTML = "Description: "
	container.appendChild(descriptionLabel)

	let descriptionInput = document.createElement("textarea")
	descriptionInput.value = description
	container.appendChild(descriptionInput)

	let modal = createModal(container)

	let saveChanges = document.createElement("button")
	saveChanges.innerHTML = "Save Changes"
	saveChanges.addEventListener("click", async function() {
		try {
			await saveStudyToServer({
				ID,
				name: nameInput.value,
				description: descriptionInput.value
			})
			modal.remove()
			callback()
		}
		catch (e) {
			console.error(e)
			alert(e)
		}

	})
	container.appendChild(saveChanges)
}


async function saveStudyToServer(newStudyDetails) {
	//TODO: Change the studies object so we don't need to refresh all studies. 
	let request = await fetch("studies?type=set", {
		method: "POST",
		body: JSON.stringify(newStudyDetails),
		headers: {
			authtoken: await firebase.auth().currentUser?.getIdToken(),
		}
	})

	let response = await request.text()
	if (request.status !== 200) {
		throw `Error in Request: ${response}`
	}
	else {
		console.log(response) //Sends back server version of study.
	}
}


export {openStudyMetadataEditor, saveStudyToServer}

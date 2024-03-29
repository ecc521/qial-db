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
			let resp = await saveStudyToServer({
				ID,
				name: nameInput.value,
				description: descriptionInput.value
			})
			modal.remove()
			callback(JSON.parse(resp))
		}
		catch (e) {
			console.error(e)
			alert(e)
		}

	})
	container.appendChild(saveChanges)

	if (ID) {
		//Add delete button if the study exists.
		let deleteStudy = document.createElement("button")
		deleteStudy.innerHTML = "Delete Study"
		deleteStudy.addEventListener("click", async function() {
			try {
				if (
					confirm("Are you sure you want to delete this study?")
					&& confirm("Are you absolutely sure you want to delete this study?")
					&& confirm("Are you absolutely absolutely sure you want to delete this study?")
				) {
					await deleteStudyFromServer({ID})
					modal.remove()
					callback()
				}
				else {
					alert("Delete cancelled by user. ")
				}
			}
			catch (e) {
				console.error(e)
				alert(e)
			}
		})
		container.appendChild(deleteStudy)
	}
}

async function studyServerSync(study, type = "set") {
	let request = await fetch(`studies?type=${type}`, {
		method: "POST",
		body: JSON.stringify(study),
		headers: {
			authtoken: await firebase.auth().currentUser?.getIdToken(),
		}
	})

	let response = await request.text()
	if (request.status !== 200) {
		throw `Error in Request: ${response}`
	}
	return response
}


function saveStudyToServer(study) {
	return studyServerSync(study, "set")
}

function deleteStudyFromServer(study) {
	return studyServerSync(study, "delete")
}

export {openStudyMetadataEditor, saveStudyToServer, deleteStudyFromServer}

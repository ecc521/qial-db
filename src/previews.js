import {openNeuroglancer, getPrecomputedURL} from "./neuroglancer.js"
import {initializeGraphs} from "./graphs.js"
import {initializeSearch, runSearch} from "./search.js"

let itemContainer = document.getElementById("items")
window.itemHolder = [] //itemHolder currently holds files only - no animals.
window.parentHolder = [] //animals and files not part of an animal/

function Item(item) {
	this.item = item

	if (item.parent) {
		this.parent = item.parent
		delete item.parent
	}

	this.row = document.createElement("div")
	this.row.className = "itemRow"

	this.checkbox = document.createElement("input")
	this.checkbox.type = "checkbox"
	this.checkbox.className = "selectBox"
	this.row.appendChild(this.checkbox)

	this.infoCard = document.createElement("div")
	this.infoCard.className = "infoCard"
	this.row.appendChild(this.infoCard)

	let addText = (function addText(text, container = this.infoCard) {
		let p = document.createElement("p")
		p.innerHTML = text
		container.appendChild(p)
		return p
	}).bind(this)

	function addProp(name, val) {
		if (val !== undefined) {
			addText(`${name}: ${val}`)
		}
	}

	this.componentRows = []

	item["Image Count"] = String(item?.views?.length ?? "")

	if (item.type === "file" || item.type === "datafile") {
		itemHolder.push(this)
		if (!this.parent) {
			parentHolder.push(this)
		}

		let itemName = addText(`File Name: ${item.name}`)
		//Add a link to download directly.
		let downloadLink = document.createElement("a")
		downloadLink.href = `${window.location.origin}/data/${item.name}`
		downloadLink.target = "_blank"
		itemName.replaceWith(downloadLink)
		downloadLink.appendChild(itemName)

		addText(`Size: ${window.numberPrettyBytesSI(item.size, 2)}`)
		addText(`Last Modified: ${new Date(item.lastModified).toDateString()}`)

		let renameButton = document.createElement("button")
		renameButton.classList.add("renameButton")
		renameButton.innerHTML = "Rename"
		this.row.appendChild(renameButton)
		renameButton.addEventListener("click", function() {
			fetch("fileops", {
				method: 'PATCH',
				headers: {
				  	'qial-filename': item.name,
				  	'qial-target-filename': prompt("Please enter new filename (don't forget extension!)"),
				},
			}).then((response) => {
				response.text().then((result) => {
					alert(result)
				})
			})
		})
	}
	else if (item.type === "animal") {
		parentHolder.push(this)
		//TODO: We should probably nest directories IF there are files not in the directory and the directory has more than some number of files.
		//Maybe nest always, just autoexpand.
		this.componentFiles = item.componentFiles
		this.componentFiles = this.componentFiles.map((component) => {
			component.parent = this
			let item = new Item(component)
			this.componentRows.push(item.row)
			return item
		})

		let setComponentVisibility = (function() {
			if (this.checkbox.checked === false) {
				this.componentFiles.forEach((file) => {
					file.row.style.display = "none"
					file.checkbox.checked = false
				})
			}
			else {
				this.componentFiles.forEach((file) => {
					file.row.style.display = ""
					file.checkbox.checked = true
				})
			}
		}).bind(this)

		setComponentVisibility()
		this.checkbox.addEventListener("change", setComponentVisibility)

		addText(`Animal: ${item.Animal}`)
		addProp("Sex", item.Sex)
		addProp("Genotype", item.Genotype)
		addProp("Weight", item.weight)
		addProp("DOB", item.DOB)
		addProp("File Count", item.componentFiles.length)

		if (item.Sex === "male") {this.row.style.backgroundColor = "#eeeeff"}
		else if (item.Sex === "female") {this.row.style.backgroundColor = "#ffeeee"}

		this.thumbnailContainer = document.createElement("div")
		this.thumbnailContainer.className = "thumbnailContainer"
		this.row.appendChild(this.thumbnailContainer)

		function getFileSize(fileName) {
			//This may throw IF (and hopefully only if) the same image is used by multiple animals (as the image may be added, without the file being added to
			//componentFiles, as it was already reclaimed)
			try {
				return item.componentFiles.find((componentFile) => {return componentFile.name === fileName}).size
			}
			catch (e) {
				console.error("Error logged below. See code comments for more details. ")
				console.error(e)
				console.error(item)
				console.error(fileName)
				console.error(item.componentFiles)
				return //We don't know.
			}
		}

		function addThumbnails(view, container, fileSize) {
			if (!view.precomputed) {console.warn("No Thumbnails");return;}
			;["x", "y", "z"].map(name => name + ".webp").forEach((fileName) => {
				let img = document.createElement("img")
				img.loading = "lazy"
				img.src = getPrecomputedURL(`${view.precomputed.source}/${fileName}`, true)
				container.appendChild(img)
			})
			container.addEventListener("click", function() {
				openNeuroglancer({
					fileName: view.precomputed.source,
					labelName: view.precomputed.labels
				})
			})
		}

		function createButton(view, fileSize) {
			let preview = document.createElement("button")
			preview.className = "neuroglancerLink"

			//Neuroglancer doesn't support 64 bit floats - so we can't always provide a precomputed that is
			//exactly the same as the input file. We may want to provide a warning on affected files (mostly larger ones),
			//so that people know they
			if (!view.precomputed) {
				preview.innerHTML = `Download ${view.name}`

				preview.addEventListener("click", function() {
					var link = document.createElement("a");
				    link.setAttribute('download', view.name);
				    link.href = "data/" + view.name;
				    document.body.appendChild(link);
				    link.click();
				    link.remove();
				})
			}
			else {
				preview.innerHTML = `View ${view.name} in Neuroglancer`
				preview.addEventListener("click", function() {
					openNeuroglancer({
						fileName: view.filePath,
						labelName: view.labelPath
					})
				})
			}

			//We'll want to make sure this is somewhat short. Long messages could lead to ugly rendering with lots of empty space.
			if (preview.innerHTML.length > 50) {
				preview.innerHTML = preview.innerHTML.slice(0, 47) + "..."
			}

			return preview
		}

		for (let i=0;i<item.views.length;i++) {
			let view = item.views[i]
			let scanContainer = document.createElement("div")
			scanContainer.className = "scanContainer"
			scanContainer.style.textAlign = "center"
			this.thumbnailContainer.appendChild(scanContainer)

			let fileSize = getFileSize(view.filePath)

			addThumbnails(view, scanContainer, fileSize)

			scanContainer.appendChild(document.createElement("br"))
			let button = createButton(view, fileSize)
			scanContainer.appendChild(button)
		}
	}
	else {
		console.warn("Unknown Type: " + item.type)
	}

	addProp("Warnings", item.warnings)
	addProp("Errors", item.errors)
}


window.drawCards = function drawCards(items) {
	itemHolder = []
	parentHolder = []
	while(itemContainer.firstChild) {itemContainer.firstChild.remove()}
	for (let i=0;i<items.length;i++) {
		let item = items[i]
		item = new Item(item) //REDEFINE OF VARIABLE!!!
		itemContainer.appendChild(item.row)
		item.componentRows.forEach((row) => {
			itemContainer.appendChild(row)
		})
	}
}

;(async function() {
	let request = await fetch("data.json")
	let response = await request.json()
	window.data = response.data

	drawCards(window.data) //Need to get Image Count set BEFORE search code runs. TODO: Double drawing is slow. Use convertTo or something, or assign Image Count before drawing?

	initializeSearch()
	runSearch() //Run again to display details on percentage drawn and stuff.

	initializeGraphs()

}())

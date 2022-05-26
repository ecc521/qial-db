import File from "../lib/File/index.js"
import Scan from "../lib/Scan/index.js"
import Subject from "../lib/Subject/index.js"

import {openNeuroglancer} from "./neuroglancer.js"
import {initializeGraphs} from "./graphs.js"
// import {initializeSearch, runSearch} from "./search.js"

let itemContainer = document.getElementById("items")
window.itemHolder = [] //itemHolder currently holds files only - no animals.
window.parentHolder = [] //animals and files not part of an animal/

function Item(item, parentItem) {
	this.item = item

	if (parentItem) {
		this.parent = parentItem
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

	if (item instanceof File) {
		itemHolder.push(this)
		if (!this.parent) {
			parentHolder.push(this)
		}

		let fileName = item.path
		if (fileName.indexOf("/") > -1) {
			fileName = fileName.slice(fileName.lastIndexOf("/") + 1) //File path contains a leading data/
		}
		let itemName = addText(`File Name: ${fileName}`)
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
		renameButton.addEventListener("click", async function() {
			let token = await firebase.auth().currentUser?.getIdToken()

			fetch("fileops", {
				method: 'PATCH',
				headers: {
				  	'qial-filename': item.name,
				  	'qial-target-filename': prompt("Please enter new filename (don't forget extension!)"),
					"authtoken": token,
				},
			}).then((response) => {
				response.text().then((result) => {
					alert(result)
				})
			})
		})
	}
	else if (item instanceof Subject) {
		parentHolder.push(this)
		//TODO: We should probably nest directories IF there are files not in the directory and the directory has more than some number of files.
		//Maybe nest always, just autoexpand.

		this.componentRows = []
		this.scanIDs = item.scanIDs
		for (let i=0;i<this.scanIDs.length;i++) {
			let scanID = this.scanIDs[i]
			let scan = window.currentStudy.contents.Scans[scanID]
			for (let fileID of scan.sourceFiles) {
				let file = window.currentStudy.contents.Files[fileID]
				let item = new Item(file, this)
				this.componentRows.push(item)
			}
		}
		// this.scanIDs = this.scanIDs.map((component) => {
		// 	let item = new Item(component, this)
		// 	this.scanIDs.push(item.row)
		// 	return item
		// })

		let setComponentVisibility = (function() {
			if (this.checkbox.checked === false) {
				this.componentRows.forEach((file) => {
					file.row.style.display = "none"
					file.checkbox.checked = false
				})
			}
			else {
				this.componentRows.forEach((file) => {
					file.row.style.display = ""
					file.checkbox.checked = true
				})
			}
		}).bind(this)

		setComponentVisibility()
		this.checkbox.addEventListener("change", setComponentVisibility)

		addText(`Subject: ${item.ID}`)
		addProp("Sex", item.Sex)
		addProp("Genotype", item.Genotype)
		addProp("Weight", item.weight)
		addProp("DOB", item.DOB)

		if (item.Sex === "M") {this.row.style.backgroundColor = "#eeeeff"}
		else if (item.Sex === "F") {this.row.style.backgroundColor = "#ffeeee"}

		this.thumbnailContainer = document.createElement("div")
		this.thumbnailContainer.className = "thumbnailContainer"
		this.row.appendChild(this.thumbnailContainer)

		function addThumbnails(view, container, fileSize) {
			if (!view.precomputed) {console.warn("No Thumbnails");return;}
			;["x", "y", "z"].map(name => name + ".webp").forEach((fileName) => {
				let img = document.createElement("img")
				img.loading = "lazy"
				img.src = `${window.currentStudy.path}/${view.precomputed}/${fileName}`
				container.appendChild(img)
			})
			container.addEventListener("click", function() {
				openNeuroglancer(view)
			})
		}

		function createButton(scan, fileSize) {
			let preview = document.createElement("button")
			preview.className = "neuroglancerLink"

			//Neuroglancer doesn't support 64 bit floats - so we can't always provide a precomputed that is
			//exactly the same as the input file. We may want to provide a warning on affected files (mostly larger ones),
			//so that people know they
			if (!scan.precomputed) {
				//TODO: If more than one sourceFile for this scan, produce a zip for all of them.
				preview.innerHTML = `Download ${scan.ID}`

				preview.addEventListener("click", function() {
					var link = document.createElement("a");
				    link.setAttribute('download', scan.ID);
				    link.href = `${window.currentStudy.path}/${scan.sourceFiles[0].path}`
				    document.body.appendChild(link);
				    link.click();
				    link.remove();
				})
			}
			else {
				preview.innerHTML = `View ${scan.ID} in Neuroglancer`
				preview.addEventListener("click", function() {
					openNeuroglancer(scan)
				})
			}

			//We'll want to make sure this is somewhat short. Long messages could lead to ugly rendering with lots of empty space.
			if (preview.innerHTML.length > 50) {
				preview.innerHTML = preview.innerHTML.slice(0, 47) + "..."
			}

			return preview
		}

		for (let scanID of item.scanIDs) {
			let scan = window.currentStudy.contents.Scans[scanID]

			let scanContainer = document.createElement("div")
			scanContainer.className = "scanContainer"
			scanContainer.style.textAlign = "center"
			this.thumbnailContainer.appendChild(scanContainer)

			let fileSize = 0;
			for (let fileID of scan.sourceFiles) {
				fileSize += window.currentStudy.contents.Files[fileID].size
			}

			addThumbnails(scan, scanContainer, fileSize)

			scanContainer.appendChild(document.createElement("br"))
			let button = createButton(scan, fileSize)
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
	console.log(items)
	while(itemContainer.firstChild) {itemContainer.firstChild.remove()}
	for (let i=0;i<items.length;i++) {
		let item = items[i]
		item = new Item(item) //REDEFINE OF VARIABLE!!!
		itemContainer.appendChild(item.row)
		item.componentRows.forEach((item) => {
			itemContainer.appendChild(item.row)
		})
	}
}
//
// ;(async function() {
// 	let request = await fetch("data.json")
// 	let response = await request.json()
// 	window.data = response.data
//
// 	drawCards(window.data) //Need to get Image Count set BEFORE search code runs. TODO: Double drawing is slow. Use convertTo or something, or assign Image Count before drawing?
	//
	// initializeSearch()
	// runSearch() //Run again to display details on percentage drawn and stuff.
	//
	// initializeGraphs()
//
// }())

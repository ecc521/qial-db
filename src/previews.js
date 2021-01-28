window.dataDir = window.location.protocol + "//" + window.location.host + "/data/"

const generateNeuroglancerLink = require("./generateNeuroglancerLink.js")

let itemContainer = document.getElementById("items")
window.itemHolder = [] //itemHolder currently holds files only - no animals.

function Item(item) {
	this.item = item

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
	}).bind(this)

	this.componentRows = []

	item["Number of Images"] = String(item?.views?.length ?? "")

	if (item.type === "file") {
		itemHolder.push(this)
		addText(`File Name: ${item.name}`)
		addText(`Size: ${window.numberPrettyBytesSI(item.size, 2)}`)
		addText(`Last Modified: ${new Date(item.lastModified).toDateString()}`)

		let renameButton = document.createElement("button")
		renameButton.classList.add("renameButton")
		renameButton.innerHTML = "Rename"
		this.row.appendChild(renameButton)
		renameButton.addEventListener("click", function() {
			fetch(url + "fileops", {
				method: 'PATCH',
				headers: {
					'qial-password': prompt("Please enter Qial-DB Password"),
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
		this.componentFiles = item.componentFiles
		this.componentFiles = this.componentFiles.map((component) => {
			let item = new Item(component)
			item.parent = this
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
		addText(`Sex: ${item.Sex}`)
		addText(`Genotype: ${item.Genotype}`)
		addText(`Weight: ${item.weight}`)
		addText(`DOB: ${item.DOB}`)
		addText(`File Count: ${item.componentFiles.length}`)

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

		let maxPreviewSize = 10000000 //10 MB
		function addThumbnails(view, container, fileSize) {
			view.thumbnails.forEach((fileName) => {
				let img = document.createElement("img")
				img.src = dataDir + fileName
				container.appendChild(img)

				if (fileSize > maxPreviewSize) {
					img.addEventListener("click", function() {
						alert("This is a somewhat large file. Please download it to preview. ")
					})
				}
				else {
					img.addEventListener("click", function() {
						window.open(generateNeuroglancerLink(view.filePath))
					})
				}
			})
		}

		function createButton(view, fileSize) {
			let preview = document.createElement("button")
			preview.className = "neuroglancerLink"

			if (fileSize > maxPreviewSize) {
				preview.innerHTML = `Download ${view.name}`
				preview.addEventListener("click", function() {
					var link = document.createElement("a");
				    link.setAttribute('download', view.name);
				    link.href = dataDir + view.name;
				    document.body.appendChild(link);
				    link.click();
				    link.remove();
				})
			}
			else {
				preview.innerHTML = `View ${view.name} in Neuroglancer`
				preview.addEventListener("click", function() {
					window.open(generateNeuroglancerLink(view.filePath))
				})
			}

			return preview
		}

		for (let i=0;i<item.views.length;i++) {
			let view = item.views[i]
			let scanContainer = document.createElement("div")
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
}


window.drawCards = function drawCards(items) {
	itemHolder = []
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
	let request = await fetch(url + "data.json")
	let response = await request.json()
	window.data = response

	drawCards(window.data)
	require("./search.js").generateSearchOptions(window.data)
	require("./graphs.js")
}())

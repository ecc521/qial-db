const dataDir = window.location.protocol + "//" + window.location.host + "/data/"

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

		function addThumbnails(view, container) {
			view.thumbnails.forEach((fileName) => {
				let img = document.createElement("img")
				img.src = dataDir + fileName
				img.addEventListener("click", function() {
					window.open(generateNeuroglancerLink(view.filePath))
				})
				container.appendChild(img)
			})
		}

		function createButton(view) {
			let preview = document.createElement("button")
			preview.innerHTML = `View ${view.name} in Neuroglancer`
			preview.className = "neuroglancerLink"
			preview.addEventListener("click", function() {
				window.open(generateNeuroglancerLink(view.filePath))
			})
			return preview
		}

		for (let i=0;i<item.views.length;i++) {

			let view = item.views[i]
			let scanContainer = document.createElement("div")
			scanContainer.style.textAlign = "center"
			this.thumbnailContainer.appendChild(scanContainer)

			addThumbnails(view, scanContainer)

			scanContainer.appendChild(document.createElement("br"))
			let button = createButton(view)
			scanContainer.appendChild(button)
		}
	}
	else {
		console.warn("Unknown Type: " + item.type)
	}
}

function generateNeuroglancerLink(fileName) {
	let imageLink = dataDir + fileName

	let obj = {
		"dimensions": {
			"x": [
				0.001,
				"m"
			],
			"y": [
				0.001,
				"m"
			],
			"z": [
				0.001,
				"m"
			]
		},
		"position": [
			0.5510525703430176,
			-0.20108343660831451,
			0.5
		],
		"crossSectionScale": 0.04349045473491386,
		"projectionScale": 29.78820805862177,
		"layers": [
			{
				"type": "image",
				"source": "nifti://" + imageLink,
				"tab": "source",
				"name": fileName
			}
		],
		"selectedLayer": {
			"layer": fileName,
			"visible": true
		},
		"layout": "4panel",
		"partialViewport": [
			0,
			0,
			1,
			1
		]
	}

	let neuroglancerLink = "https://neuroglancer-demo.appspot.com/" + "#!" + encodeURI(JSON.stringify(obj))
	return neuroglancerLink
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
}())

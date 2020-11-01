const dataDir = window.location.protocol + "//" + window.location.host + "/data/"

let itemContainer = document.getElementById("items")

function createItem(item) {
	let row = document.createElement("div")
	row.className = "itemRow"

	let checkbox = document.createElement("input")
	checkbox.type = "checkbox"
	checkbox.className = "selectBox"
	row.appendChild(checkbox)

	let infoCard = document.createElement("div")
	infoCard.className = "infoCard"
	row.appendChild(infoCard)

	function addText(text, container = infoCard) {
		let p = document.createElement("p")
		p.innerHTML = text
		container.appendChild(p)
	}

	if (item.type === "file") {
		addText(`File Name: ${item.name}`)
		addText(`Size: ${window.numberPrettyBytesSI(item.size, 2)}`)
		addText(`Last Modified: ${new Date(item.lastModified).toDateString()}`)
	}
	else if (item.type === "animal") {
		addText(`Animal: ${item.Animal}`)
		addText(`Sex: ${item.Sex}`)
		addText(`Genotype: ${item.Genotype}`)
		addText(`Weight: ${item.weight}`)
		addText(`DOB: ${item.DOB}`)


		if (item.Sex === "male") {row.style.backgroundColor = "#eeeeff"}
		else if (item.Sex === "female") {row.style.backgroundColor = "#ffeeee"}


		let thumbnailContainer = document.createElement("div")
		thumbnailContainer.className = "thumbnailContainer"
		row.appendChild(thumbnailContainer)

		function addThumbnails(view, container) {
			view.thumbnails.forEach((fileName) => {
				let img = document.createElement("img")
				img.src = dataDir + fileName
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
			thumbnailContainer.appendChild(scanContainer)

			addThumbnails(view, scanContainer)

			scanContainer.appendChild(document.createElement("br"))
			let button = createButton(view)
			scanContainer.appendChild(button)
		}
	}
	else {
		console.warn("Unknown Type: " + item.type)
	}

	return row
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


function drawCards(items) {
	while(itemContainer.firstChild) {itemContainer.firstChild.remove()}
	for (let i=0;i<items.length;i++) {
		let item = items[i]
		let row = createItem(item)
		itemContainer.appendChild(row)
	}
}

;(async function() {
	let request = await fetch(url + "data.json")
	let response = await request.json()
	console.log(response)

	drawCards(response)
}())

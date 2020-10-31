let cardHolder = document.getElementById("items")

function drawCards(items) {
	function createRow() {
		let row = document.createElement("div")
		row.className = "cardHolderRow"
		cardHolder.appendChild(row)
		return row
	}

	let row = createRow()

	for (let i=0;i<items.length;i++) {
		let item = items[i]
		let card = document.createElement("div")
		card.className = "previewCard"
		if (row.children.length >= 3) {
			row = createRow()
		}
		row.appendChild(card)

		function addText(text) {
			let p = document.createElement("p")
			p.innerHTML = text
			card.appendChild(p)
		}

		addText(`Animal: ${item.Animal}`)
		addText(`Sex: ${item.Sex}`)
		addText(`DOB: ${item.DOB}`)
		addText(`Genotype: ${item.Genotype}`)
		addText(`Weight: ${item.weight}`)
		addText(`Date: ${item.Date}`)

		if (item.Sex === "male") {card.style.backgroundColor = "#eeeeff"}
		else if (item.Sex === "female") {card.style.backgroundColor = "#ffeeee"}


		if (item["SAMBA Brunno"]) {
			let fileName = item["SAMBA Brunno"] + "_T1_masked.nii.gz"
			let imageLink = window.location.protocol + "//" + window.location.host + "/data/" + fileName

			let preview = document.createElement("button")
			preview.innerHTML = "View in Neuroglancer"
			preview.className = "neuroglancerLink"
			card.appendChild(preview)
			preview.addEventListener("click", function() {
				//Create neuroglancer link.

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
				window.open(neuroglancerLink)
			})
		}
	}
}

;(async function() {
	let request = await fetch(url + "data.json")
	let response = await request.json()
	console.log(response)

	drawCards(response)
}())

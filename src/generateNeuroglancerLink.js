function generateNeuroglancerLink(fileName) {
	let imageLink = window.dataDir + fileName

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

module.exports = generateNeuroglancerLink

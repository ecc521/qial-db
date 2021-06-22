function generateNeuroglancerLink({fileName, labelName}) {
	let obj = {
		"dimensions": {
			"x": [
				0.0001,
				"m"
			],
			"y": [
				0.0001,
				"m"
			],
			"z": [
				0.001,
				"m"
			]
		},
		"position": [
			100.5,
			100.5,
			5.5
		],
		"layers": [
			{
				"type": "image",
				"source": {
					"url": `precomputed://${window.location.href}cache/precomputed/${fileName}`,
					"transform": {
						"matrix": [
							[
								1,
								0,
								0,
								0
							],
							[
								0,
								1,
								0,
								0
							],
							[
								0,
								0,
								1,
								0
							]
						],
						"outputDimensions": {
							"x": [
								0.0001,
								"m"
							],
							"y": [
								0.0001,
								"m"
							],
							"z": [
								0.001,
								"m"
							]
						}
					}
				},
				"tab": "source",
				"name": fileName
			},
		],
		"selectedLayer": {
			"visible": true,
			"layer": fileName
		},
		"layout": "4panel",
	}

	if (labelName) {
		obj.layers.push({
			"type": "segmentation",
			"source": {
				"url": `precomputed://${window.location.href}cache/precomputed/${labelName}`,
				"subsources": {
					"default": true,
					"bounds": true
				},
				"enableDefaultSubsources": false
			},
			"tab": "source",
			"colorSeed": 1557235359,
			"name": labelName
		})
	}

	let appspotDemoUrl = "https://neuroglancer-demo.appspot.com/" //Appspot demo is hosted by Google.
	//This can be used if we need to host our own version. Note that building neuroglancer uses
	//a gigabyte or so of memory - the files can be uploaded to bypass this requirement. (once built, it's just static files)
	let selfHostedUrl = window.location.href + `neuroglancer/dist/min/`
	let neuroglancerLink = selfHostedUrl + `#!` + encodeURI(JSON.stringify(obj))
	return neuroglancerLink
}

module.exports = generateNeuroglancerLink

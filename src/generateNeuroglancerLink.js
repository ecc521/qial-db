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
		"crossSectionScale": 0.4604787884355259,
		"projectionOrientation": [
			0.02498326078057289,
			0.10617389529943466,
			-0.2379075437784195,
			0.9651439785957336
		],
		"projectionScale": 297.88209834137433,
		"projectionDepth": -332.3518337523922,
		"layers": [
			{
				"type": "image",
				"source": {
					"url": `nifti://${window.location.href}data/${fileName}`,
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
				"url": `precomputed://${window.location.href}cache/precomputedlabels/${labelName}`,
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

	let neuroglancerLink = window.location.href + `neuroglancer/dist/min/#!` + encodeURI(JSON.stringify(obj))
	return neuroglancerLink
}

module.exports = generateNeuroglancerLink

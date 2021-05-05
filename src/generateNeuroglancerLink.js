function generateNeuroglancerLink(fileName) {
	let imageLink = window.dataDir + fileName

	let obj = {
		"dimensions": {
			"x": [
				0.00009999999403953553,
				"m"
			],
			"y": [
				0.00010000000149011611,
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
					"url": "nifti://http://127.0.0.1:9400/data/B51315_T1_masked.nii.gz",
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
								0.00009999999403953553,
								"m"
							],
							"y": [
								0.00010000000149011611,
								"m"
							],
							"z": [
								0.001,
								"m"
							]
						}
					}
				},
				"tab": "rendering",
				"name": "B51315_T1_masked.nii.gz"
			},
			{
				"type": "segmentation",
				"source": {
					"url": "precomputed://http://127.0.0.1:9400/Output",
					"subsources": {
						"default": true,
						"bounds": true
					},
					"enableDefaultSubsources": false
				},
				"tab": "segments",
				"colorSeed": 1557235359,
				"name": "Output"
			}
		],
		"selectedLayer": {
			"size": 755,
			"visible": true,
			"layer": "Output"
		},
		"layout": "4panel",
		"selection": {
			"size": 755,
			"layers": {
				"Output": {
					"annotationId": "data-bounds",
					"annotationSource": 0,
					"annotationSubsource": "bounds"
				}
			}
		}
	}

	let neuroglancerLink = "https://neuroglancer-demo.appspot.com/" + "#!" + encodeURI(JSON.stringify(obj))
	return neuroglancerLink
}

module.exports = generateNeuroglancerLink

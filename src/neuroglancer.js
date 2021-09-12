function getPrecomputedURL(fileName, isHttp=false) {
	let url = `${window.location.origin}/cache/precomputed/${fileName}`
	if (!isHttp) {url = "precomputed://" + url}
	return url
}

async function openNeuroglancer({fileName, labelName}) {
	//TODO: We should fetch the norm.json from the server when we go to run this.
	//This would require us to calculate the link on click. (if there is an error, just open with no normalization range. )
	let obj = {
		"layers": [
			{
				"type": "image",
				"source": {
					"url": getPrecomputedURL(fileName)
				},
				"tab": "source", //TODO: render tab, with the window open? Or source tab?
				"name": fileName
			},
		],
		"selectedLayer": {
			"visible": true,
			"layer": fileName
		},
		"layout": "4panel",
	}


	try {
		//Attempt to load norm.json
		let promise = new Promise((resolve, reject) => {
			fetch(getPrecomputedURL(fileName, true) + "/norm.json").then((resp) => {
				console.log(resp)
				resp.text().then((text) => {
					let normData = JSON.parse(text.replaceAll(`'`, `"`)) //Python output isn't quite valid JSON. TODO: Fix this.

					obj.layers[0].shaderControls = {
						normalized: {
							range: [normData.lower, normData.upper], //Default range.
							window: [normData.min, normData.max] //Default scale (there is a graph, on which the range is highlighted. This is the x axis for the graph - should be no smaller than window)
						}
					}
					resolve()
				})
			})
		})

		//Time out on norm.json after one second.
		await Promise.race([
			promise,
			new Promise((resolve) => {setTimeout(resolve, 1000)})
		])
	}
	catch (e) {
		console.error(e)
	}

	if (labelName) {
		obj.layers.push({
			"type": "segmentation",
			"source": {
				"url": getPrecomputedURL(labelName),
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
	let neuroglancerLink = appspotDemoUrl + `#!` + encodeURI(JSON.stringify(obj))
	console.log(obj)
	window.open(neuroglancerLink)
	return neuroglancerLink
}

module.exports = {openNeuroglancer}

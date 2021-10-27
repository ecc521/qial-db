function getPrecomputedURL(fileName, isHttp=false) {
	let url = `${window.location.origin}/cache/precomputed/${fileName}`
	if (!isHttp) {url = "precomputed://" + url}
	return url
}


//Neuroglancer Shader when colored
//Docs at https://github.com/google/neuroglancer/blob/master/src/neuroglancer/sliceview/image_layer_rendering.md
let coloredShader =
`#uicontrol float contrast slider(min=-3, max=3, step=0.01)
#uicontrol invlerp r (channel=0)
#uicontrol invlerp g (channel=1)
#uicontrol invlerp b (channel=2)

void main() {
    emitRGB(
        vec3(
            r(getDataValue(0)),
            g(getDataValue(1)),
            b(getDataValue(2))
        )
        * exp(contrast)
    );
}`


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
		//Rotate the images to Allen Mouse Brain Common Coordinate Framework
		//TODO: It looks like the bottom quadrant may need some work.
		"crossSectionOrientation": [0.5, 0.5, -0.5, -0.5],
		"projectionOrientation": [0, 0, (2 ** 0.5) / 2, (2 ** 0.5) / 2]//Rotate the 3D viewing pane as well.
	}


	try {
		//Attempt to load norm.json
		let promise = new Promise((resolve, reject) => {
			fetch(getPrecomputedURL(fileName, true) + "/norm.json").then((resp) => {
				console.log(resp)
				resp.json().then((normData) => {
					obj.layers[0].shaderControls = {
						normalized: {
							range: [normData.lower, normData.upper], //Default range.
							window: [normData.min, normData.max] //Default scale (there is a graph, on which the range is highlighted. This is the x axis for the graph - should be no smaller than window)
						}
					}

					//Use color shaders when norm.json colorSpace is "rgb"
					if (normData.colorSpace === "rgb") {
						obj.layers[0].shader = coloredShader
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
		//May need to turn on "enableDefaultSubsources" or other config if labels stop appearing at some point.
		//Seems to be default right now (which makes sense given name).
		obj.layers.push({
			"source": {
				"url": getPrecomputedURL(labelName),
			},
			"tab": "source",
			"colorSeed": 1557235359,
			"name": labelName
		})

		//Expand selection panel - the descriptions for the labels are shown here.
		//Make sure the selectedLayer panel is much larger though - selection panel shouldn't cover anything up.
		obj.selection = {flex: 0.6}
		obj.selectedLayer.flex = 1.4
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

module.exports = {openNeuroglancer, getPrecomputedURL}

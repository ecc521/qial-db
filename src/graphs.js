let graphsDiv = document.createElement("div")
graphsDiv.id = "graphsDiv"
document.body.insertBefore(graphsDiv, document.getElementById("search").nextElementSibling)

let graphOptions = {
	"Violin Plot": {
		//We'll probably want to use split violin if z is binary (only two options, like M/F).
		x: {
			allow: "all",
		},
		y: {
			allow: "numeric",
		},
		w: {
			allow: "all",
		}
	},
	"Scatter Plot": {
		x: {
			allow: "all"
		},
		y: {
			allow: "numeric", //non-numeric y axes actually work here.
			multiple: "true"
		},
		w: {
			allow: "all"
		}
	},
	"3D Scatter Plot": {
		x: {
			allow: "all"
		},
		y: {
			allow: "all"
		},
		z: {
			allow: "all",
		},
		w: {
			allow: "all"
		}
	}
	// "Correlation": {
	// 	x: {
	// 		allow: "numeric",
	// 		multiple: true
	// 	}
	// }
}

let graphCreationTools = document.createElement("div")
graphsDiv.appendChild(graphCreationTools)

let graphCreationInfo = document.createElement("label")
graphCreationInfo.innerHTML = "Generate: "
graphCreationTools.appendChild(graphCreationInfo)

let graphTypeSelector = document.createElement("select")
for (let prop in graphOptions) {
	let option = document.createElement("option")
	option.value = prop
	option.innerHTML = prop
	graphTypeSelector.appendChild(option)
}

graphCreationTools.appendChild(graphTypeSelector)

let addGraphButton = document.createElement("button")
function setButtonText() {
	//addGraphButton.innerHTML = "Create " + graphTypeSelector.value
	addGraphButton.innerHTML = "Create Plot"
}
setButtonText()
graphTypeSelector.addEventListener("change", setButtonText)
graphCreationTools.appendChild(addGraphButton)

addGraphButton.addEventListener("click", function() {
	//Insert as the first graph.
	let beforeNode = document.querySelector(".graphContainerDiv")

	graphsDiv.insertBefore(createGraphComponent({
		graphType: graphTypeSelector.value
	}), beforeNode)
	updateSearchLink()
})


//Sorts axes as numeric or non-numeric.
//This is used to generate the selectors for the different graph types.
//Some require numeric only in certain axes
let numericAxes = []
let nonNumericAxes = []

let animals = window.data.filter((a) => {return a.type === "animal"})
animals.forEach((animal) => {
	for (let prop in animal) {
		let value = animal[prop]
		//All numbers or strings that convert to number.
		if ((typeof value === "string" || typeof value === "number") && value !== "" && !isNaN(animal[prop])) {
			if (!numericAxes.includes(prop)) {
				numericAxes.push(prop)
			}
		}
	}
})

animals.forEach((animal) => {
	for (let prop in animal) {
		let value = animal[prop]
		if (typeof value === "string" && value !== "") {
			if (!numericAxes.includes(prop) && !nonNumericAxes.includes(prop)) {
				nonNumericAxes.push(prop)
			}
		}
	}
})

console.log(numericAxes, nonNumericAxes)


let graphSelections = []

function createGraphComponent({graphType, axes = {}}) {
	let componentObj = {graphType, axes}
	graphSelections.push(componentObj)

	let graphDiv = document.createElement("div")
	graphDiv.className = "graphContainerDiv"

	let axisSelectorDiv = document.createElement("div")
	graphDiv.appendChild(axisSelectorDiv)

	let plotlyContainer = document.createElement("div")
	plotlyContainer.className = "plotlyContainer"
	graphDiv.appendChild(plotlyContainer)


	//Generates the selector for an axis.
	function axisSelector(props, multiple = false, callback, initialValue) {
		if (multiple) {
			//Generate checkbox list.
			let div = document.createElement("div")
			let propsObj = {}
			props.forEach((prop) => {
				//TODO: createCheckbox and createLabel are copied from search.js
				function createCheckbox() {
					let box = document.createElement("input")
					box.type = "checkbox"
					return box
				}

				function createLabel(checkbox) {
					let label = document.createElement("label")
					if (checkbox) {
						label.addEventListener("click", function() {
							checkbox.click()
						})
					}
					return label
				}

				let box = createCheckbox()
				let label = createLabel(box)
				label.innerHTML = prop

				if (initialValue && initialValue.includes(prop)) {
					box.checked = true
				}

				div.appendChild(box)
				div.appendChild(label)

				propsObj[prop] = box
				box.addEventListener("change", function() {
					let selectedProps = []
					for (let prop in propsObj) {
						let box = propsObj[prop]
						if (box.checked) {
							selectedProps.push(prop)
						}
					}
					callback(selectedProps)
				})
			})
			return div
		}
		else {
			//Generate select element
			let select = document.createElement("select")
			let def = document.createElement("option")
			def.innerHTML = "Select Axis..."
			def.value = ""
			def.selected = true
			select.appendChild(def)

			props.forEach((prop) => {
				let option = document.createElement("option")
				option.value = option.innerHTML = prop
				select.appendChild(option)
			})
			select.addEventListener("change", function() {
				callback(select.value || undefined)
			})
			if (initialValue) {
				select.value = initialValue
			}
			return select
		}
	}

	function genGraph() {
		updateSearchLink()
		let items = window.lastSearchItems

		let data = []
		let layout = {
			title: graphType,
			xaxis: {
				title: axes.x
			},
			yaxis: {
				title: axes.y
			},
			zaxis: {
				title: axes.z
			}
		}


		function splitWAxis(items) {
			//Splits into groups based on w axis.
			console.log(axes.w)
			let groups = {}
			items.forEach((item) => {
				let val = item[axes.w]
				//If there isn't a w axis, this still works - the only w is "undefined" (and with only one w, labels aren't displayed)
				if (axes.w !== undefined && val === undefined) {return}
				if (!groups[val]) {groups[val] = []}
				groups[val].push(item)
			})
			return groups
		}

		if (graphType === "Violin Plot") {
			let groups = splitWAxis(items)

			let props = Object.keys(groups)
			let useSplitViolin = (props.length === 2)

			Object.assign(layout, {
				violinmode: useSplitViolin ? "overlay" : "group",
				violingap: 0,
				violingroupgap: 0
			})
			let yProp = axes.y

			props.forEach((prop, index) => {
				let groupItems = groups[prop]

				let info = {
					type: 'violin',
					x: [],
					y: [],
					name: prop,
					jitter: 0.05,
					box: {
						visible: true
					},
					meanline: {
						visible: true,
						width: 2
					},
					side: useSplitViolin ? "negative":"both",
					points: "all",
					pointpos: -.5, //TODO: Compute something that works here - off to the side, but minimally.
					//width: 1.5, //Boost width by 50% - TODO: Setting width doesn't work with violinmode group (it acts as if violinmode is overlay).
					//Boosting width also causes single points to overflow massively.
					margin: {
						pad: 0
					}
				}

				if (useSplitViolin && index === 1) {
					if (info.side === "positive") {info.side = "negative"}
					else if (info.side === "negative") {info.side = "positive"}
					info.pointpos = -info.pointpos
				}

				groupItems.forEach((item) => {
					let xVal = item[axes.x]
					let yVal = item[yProp]

					if (xVal !== undefined && yVal !== undefined) {
						info.x.push(xVal)
						info.y.push(yVal)
					}
				})

				data.push(info)
			})
		}
		else if (graphType === "Scatter Plot") {
			//TODO: Add regression.

			let groups = splitWAxis(items)

			let yCount = axes.y.length
			let groupCount = Object.keys(groups).length

			for (let groupName in groups) {
				let groupItems = groups[groupName]

				axes.y.forEach((yProp) => {
					let name = yProp
					if (yCount < 2) {name = groupName}
					else if (groupCount > 1) {name = groupName + "/" + yProp}

					let info = {
						x: [],
						y: [],
						mode: 'markers',
						type: 'scatter',
						name,
						marker: { size: 12 }
					}

					groupItems.forEach((item) => {
						let xVal = item[axes.x]
						let yVal = item[yProp]

						if (xVal !== undefined && yVal !== undefined) {
							info.x.push(xVal)
							info.y.push(yVal)
						}
					})

					data.push(info)
				})
			}
		}
		else if (graphType === "3D Scatter Plot") {
			let groups = splitWAxis(items)

			Object.assign(layout, {
				margin: {
					l: 0,
					r: 0,
					b: 0,
					t: 0
				}
			})

			for (let groupName in groups) {
				let groupItems = groups[groupName]

				let info = {
					x: [],
					y: [],
					z: [],
					name: groupName,
					mode: 'markers',
					marker: {
						size: 12,
					},
					type: 'scatter3d'
				}

				groupItems.forEach((item) => {
					let xVal = item[axes.x]
					let yVal = item[axes.y]
					let zVal = item[axes.z]

					if (xVal !== undefined && yVal !== undefined && zVal !== undefined) {
						info.x.push(xVal)
						info.y.push(yVal)
						info.z.push(zVal)
					}
				})

				data.push(info)
			}
		}
		// else if (graphType === "Correlation") {
		// 	//TODO: Generate correlation table.
		// 	data.push({
		// 		z: [[1, null, 30, 50, 1], [20, 1, 60, 80, 30], [30, 60, 1, -10, 20]],
		// 		x: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
		// 		y: ['Morning', 'Afternoon', 'Evening'],
		// 		type: 'heatmap',
		// 		hoverongaps: false
		// 	})
		// }
		else {throw "Unsupported graphType " + graphType}

		console.log(data)
		console.log(layout)

		Plotly.newPlot(plotlyContainer, data, layout, {
			responsive: true,
		})
	}
	window.addEventListener("searchProcessed", genGraph)

	function setGraphOptions() {
		let graphInfo = graphOptions[graphType]
		console.log(graphInfo)

		let axesCodes = ["x","y","z","w"]

		axesCodes.forEach((axis) => {
			let info = graphInfo[axis]
			if (!info) {return}

			let params = []
			if (info.allow === "all") {
				params.push(numericAxes.concat(nonNumericAxes))
			}
			else if (info.allow === "numeric") {
				params.push(numericAxes)
			}
			else {
				throw "Unknown Allow " + info.allow
			}

			params.push(info.multiple)
			params.push(function(res) {
				axes[axis] = res
				genGraph()
			})

			let elem = axisSelector(...params, axes[axis])
			axisSelectorDiv.appendChild(elem)
		})
	}
	setGraphOptions()

	let removeButton = document.createElement("button")
	removeButton.innerHTML = "Delete Plot"
	axisSelectorDiv.appendChild(removeButton)
	removeButton.addEventListener("click", function() {
		if (confirm("Are you sure you want to delete this plot?")) {
			graphDiv.remove()
			graphSelections.splice(graphSelections.indexOf(componentObj), 1)
			updateSearchLink()
		}
	})

	return graphDiv
}

function setupFromParams() {
	let params = new URLSearchParams(window.location.hash.slice(1))
	let arr = params.get("graphs")

	try {
		arr = JSON.parse(arr)
		console.log(arr)
		arr.forEach((obj) => {
			graphsDiv.appendChild(createGraphComponent(obj))
		})
	}
	catch (e) {console.error(e)}
}
setupFromParams()

function updateSearchLink() {
	let params = new URLSearchParams(window.location.hash.slice(1))
	let url = new URL(window.location.href)

	params.set("graphs", JSON.stringify(graphSelections))

	url.hash = params
	currentViewLink.href = url.href
}

module.exports = {}

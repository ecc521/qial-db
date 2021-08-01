let graphsDiv = document.createElement("div")

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
				console.log(prop)
				console.log(value)
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


let graphOptions = {
	"Violin": {
		//We'll probably want to use split violin if z is binary (only two options, like M/F).
		x: {
			allow: "all",
		},
		y: {
			allow: "numeric",
		},
		z: {
			allow: "all",
		}
	},
	"Scatter Plot": {
		x: {
			allow: "all"
		},
		y: {
			allow: "numeric",
			multiple: "true"
		},
		z: {
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
			allow: "all", //TODO: Just numeric?
			multiple: true
		}
	}
	// "Correlation": {
	// 	x: {
	// 		allow: "numeric",
	// 		multiple: true
	// 	}
	// }
}

let graphTypeSelector = document.createElement("select")
for (let prop in graphOptions) {
	let option = document.createElement("option")
	option.value = prop
	option.innerHTML = prop
	graphTypeSelector.appendChild(option)
}

graphsDiv.appendChild(graphTypeSelector)

let axisSelectorDiv = document.createElement("div")
graphsDiv.appendChild(axisSelectorDiv)

let plotlyContainer = document.createElement("div")
graphsDiv.appendChild(plotlyContainer)

//Generates the selector for an axis.
function axisSelector(props, multiple = false, callback) {
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
		return select
	}
}

let axes;
function genGraph() {
	let items = window.lastSearchItems

	let graphType = graphTypeSelector.value
	let data = []
	let layout = {
		title: graphType,
		xaxis: {
			title: axes[0]
		},
		yaxis: {
			title: axes[1]
		},
		zaxis: {
			title: axes[2]
		}
	}


	function splitZAxis(items) {
		//Splits into groups based on z axis.
		let groups = {}
		items.forEach((item) => {
			let val = item[axes[2]]
			//If there isn't a z axis, this still works, the only z is "undefined" (and with only one z, labels aren't displayed)
			if (axes[2] !== undefined && val === undefined) {return}
			if (!groups[val]) {groups[val] = []}
			groups[val].push(item)
		})
		return groups
	}

	if (graphType === "Violin") {
		let groups = splitZAxis(items)

		for (let prop in groups) {
			let groupItems = groups[prop]
			groups[prop] = {
				data: groupItems.map((item) => {
					let xVal = item[axes[0]]
					let yVal = item[axes[1]]

					return {
						x: [xVal],
						y: [yVal]
					}
				})
			}
		}

		let props = Object.keys(groups)
		let useSplitViolin = (props.length === 2)

		Object.assign(layout, {
			violinmode: useSplitViolin ? "overlay" : "group",
			violingap: 0,
			violingroupgap: 0
		})

		props.forEach((prop, index) => {
			let group  = groups[prop]

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

			group.data.forEach((data) => {
				data.x.forEach((xVal, i) => {
					let correspondingY = data.y[i]
					if (correspondingY !== undefined && xVal !== undefined) {
						info.x.push(xVal)
						info.y.push(correspondingY)
					}
				});

			});

			data.push(info)
		})
	}
	else if (graphType === "Scatter Plot") {
		//TODO: Add regression.

		let groups = splitZAxis(items)

		let yCount = axes[1].length
		let groupCount = Object.keys(groups).length

		for (let groupName in groups) {
			let groupItems = groups[groupName]

			axes[1].forEach((yProp) => {
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

				let traceItems = groupItems.map((item) => {
					let xVal = item[axes[0]]
					let yVal = item[yProp]

					return {
						x: [xVal],
						y: [yVal]
					}
				})

				traceItems.forEach((data) => {
					data.x.forEach((xVal, i) => {
						let correspondingY = data.y[i]
						if (correspondingY !== undefined && xVal !== undefined) {
							info.x.push(xVal)
							info.y.push(correspondingY)
						}
					});
				});

				data.push(info)
			})
		}
	}
	else if (graphType === "3D Scatter Plot") {

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
	while (axisSelectorDiv.lastChild) {axisSelectorDiv.lastChild.remove()}

	let graphType = graphTypeSelector.value
	let graphInfo = graphOptions[graphType]
	console.log(graphInfo)

	axes = ["x", "y", "z"]
	.filter((axis) => {return graphInfo[axis]}) //Filter out any axes that aren't used
	.map((axis, index) => {
		let info = graphInfo[axis]

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
			axes[index] = res
			genGraph()
		})

		let elem = axisSelector(...params)
		axisSelectorDiv.appendChild(elem)
	})
}
graphTypeSelector.addEventListener("change", function() {
	setGraphOptions()
	genGraph()
})
setGraphOptions()


module.exports = {genGraph, graphsDiv}

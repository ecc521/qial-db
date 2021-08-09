const {marginOfError, percentile_z} = require("./stats.js")

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
		},
		regression: true
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
	//TODO: This ordering CHANGES when the search link is followed.
	//We should probably insert below and scroll to it, or insert above in BOTH places.
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

	function genGraph() {
		updateSearchLink()

		//https://stackoverflow.com/questions/40673490/how-to-get-plotly-js-default-colors-list
		//We need the list of CSS colors so that we can do fills as the same color.
		let graphColors = [
		  '#1f77b4',
		  '#ff7f0e',
		  '#2ca02c',
		  '#d62728',
		  '#9467bd',
		  '#8c564b',
		  '#e377c2',
		  '#7f7f7f',
		  '#bcbd22',
		  '#17becf'
		];

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
					line: {color: graphColors.shift()},
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
			let groups = splitWAxis(items)
			let CI = 0.95
			let Z = percentile_z(1 - ((1 - CI) / 2))

			let yCount = axes.y.length
			let groupCount = Object.keys(groups).length

			for (let groupName in groups) {
				let groupItems = groups[groupName]

				axes.y.forEach((yProp) => {
					let name = yProp
					if (groupCount > 1) {
						name = groupName

						if (yCount > 1) {
							name += "/" + yProp //Multiple y axes per group - they need group and yProp in name.
						}
					}

					let info = {
						x: [],
						y: [],
						mode: 'markers',
						type: 'scatter',
						name,
						marker: { size: 12, color: graphColors.shift() }
					}

					let domain = [Infinity, -Infinity]
					groupItems.forEach((item) => {
						let xVal = item[axes.x]
						let yVal = item[yProp]

						if (xVal !== undefined && yVal !== undefined && xVal !== "" && yVal !== "") {
							xVal = Number(xVal)
							yVal = Number(yVal)

							info.x.push(xVal)
							info.y.push(yVal)

							if (xVal < domain[0]) {domain[0] = xVal}
							if (xVal > domain[1]) {domain[1] = xVal}
						}
					})

					data.push(info)

					console.log(axes.regression)

					axes.regression.forEach((type) => {
						//TODO: Zero values break exponential and power law.

						//Reformat data for regression.
						let points = []
						info.x.forEach((x, index) => {
							let y = info.y[index]
							points.push([x,y])
						})

						//We need to set precision extremely high. This library rounds internally during calculation, so rounding errors accumulate.
						let config = {precision: 10}
						if (type === "Linear") {config.order = 1}
						else if (type === "Quadratic") {config.order = 2}
						else if (type === "Cubic") {config.order = 3}
						else if (type === "Quartic") {config.order = 4}

						let result;

						if (config.order) {
							result = regression.polynomial(points, config)
						}
						else if (type === "Exponential") {
							result = regression.exponential(points, config)
						}
						else if (type === "Logarithmic") {
							result = regression.logarithmic(points, config)
						}
						else if (type === "Power Law") {
							result = regression.power(points, config)
						}
						else {
							console.error("Unknown Type", type)
							return
						}

						console.log(points, result)

						let color = graphColors.shift()

						let reginfo = {
							x: [],
							y: [],
							type: 'line',
							name: `${type} Reg ${name}`,
							opacity: 0.75,
							line: { width: 4, color },
							hovertemplate: `${result.string}<br>r^2 = ${Math.round(result.r2 * 100)/100}<br>(%{x}, %{y})`
						}

						//Calculate and render regression lines.
						let pointCount = 400 //Number of points that make up regression line.
						let range = domain[1] - domain[0]
						let increment = range / pointCount

						//Go a bit beyond the domain.
						let startPos = domain[0] - range * 0.01
						let endPos = domain[1] + range * 0.01

						//We'll go an extra increment further.
						for (let x=startPos;x<=endPos;x+=increment) {
							reginfo.x.push(x)
							reginfo.y.push(result.predict(x)[1]) //Predict returns an [x,y] array.
						}

						data.push(reginfo)

						if (config.order === 1) {
							//TODO: Wrap around to put both bounds in one line.
							let moeGen = marginOfError(points, 0, 1) //0 and 1 are properties.
							let text = []
							//TODO: Also show equation.
							//TODO: Show MOE for that point (read the doc - insert text based on text array)
							let moeinfo = {
								x: [],
								y: [],
								text,
								type: 'line',
								name: `${type} Reg ${name}`,
								fill: "tozerox",
								fillcolor: color + (64).toString(16).padStart(2, "0"), //Add opacity to the color (0 - 255).
								line: {
									color: "transparent"
								},
								hovertemplate: `%{text} (CI=${CI * 100}%)<br>(%{x}, %{y})`
							}

							//To fill, go all the way around - so x is [1,2,3,3,2,1,1], y is [7,8,9,2,3,4,7]
							;[-1, 1].forEach((mult) => {

								for (let i=0;i<reginfo.x.length;i++) {
									let indexToUse = i
									let pointText = "Lower Bound"
									if (mult === 1) {
										pointText = "Upper Bound"
										indexToUse = reginfo.x.length - 1 - i
									}
									let x = reginfo.x[indexToUse]
									let y = reginfo.y[indexToUse]

									let moe = moeGen(x) * Z
									pointText += `<br>MOE: ${moe}`
									text.push(pointText)

									moeinfo.x.push(x)
									moeinfo.y.push(y + moe * mult)
								}
							})

							console.log(text)

							//Duplicate the first value - close the shape.
							moeinfo.x.push(moeinfo.x[0])
							moeinfo.y.push(moeinfo.y[0])

							data.push(moeinfo)
						}
					})
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

		if (graphInfo.regression) {
			//TODO: Add regression.

			//TODO: Replace Cubic and Quartic with Polynomial (arbitrary base) - maybe replace quadratic and linear as well.
			//TODO: Allow base selection for Logarithmic (even though it doesn't really matter)
			let currentOptions = ["Linear", "Quadratic", "Cubic", "Quartic", "Exponential", "Logarithmic", "Power Law"]

			axes.regression = axes.regression || ["Linear"]
			let regressionOptions = axisSelector(currentOptions, true, function(selected) {
				console.log(selected)
				axes.regression = selected
				genGraph()
			}, axes.regression)
			axisSelectorDiv.appendChild(regressionOptions)
		}
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
	let params = window.currentParams
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
	let params = window.currentParams
	let url = new URL(window.location.href)

	params.set("graphs", JSON.stringify(graphSelections))

	url.hash = params
	currentViewLink.href = url.href
}

module.exports = {}

const regression = require("regression")
//const Loess = require("loess").default
const pearsonCorrelation = require("./graphs/pearsonCorrelation.js")
const spearmanCorrelation = require("./graphs/spearmanCorrelation.js")
const obtainGroupPoints = require("./graphs/obtainGroupPoints.js")
const axisSelector = require("./graphs/axisSelector.js")

const {marginOfError, percentile_z} = require("./graphs/stats.js")

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
	},
	"Correlation Table": {
		x: {
			allow: "numeric",
			multiple: true
		},
		y: {
			allow: ["Pearson", "Spearman"],
			preset: "Pearson"
		}
	}
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
	let newGraph = createGraphComponent({
		graphType: graphTypeSelector.value
	})
	graphsDiv.insertBefore(newGraph, beforeNode)
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
		let values = animal[prop]
		if (!(values instanceof Array)) {values = [values]}

		values.forEach((value) => {
			//All numbers or strings that convert to number.
			if ((typeof value === "string" || typeof value === "number") && value !== "" && !isNaN(value)) {
				if (!numericAxes.includes(prop)) {
					numericAxes.push(prop)
				}
			}
		})
	}
})

animals.forEach((animal) => {
	for (let prop in animal) {
		let values = animal[prop]
		if (!(values instanceof Array)) {values = [values]}

		values.forEach((value) => {
			if (typeof value === "string" && value !== "") {
				if (!numericAxes.includes(prop) && !nonNumericAxes.includes(prop)) {
					nonNumericAxes.push(prop)
				}
			}
		})
	}
})

console.log(numericAxes, nonNumericAxes)


let graphSelections = []

function createGraphComponent({graphType, axes = {}}) {
	let componentObj = {graphType, axes}
	graphSelections.unshift(componentObj) //New graphs are added to the beginning, not end,

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

		//There can be multiple y axes - If there's only one item selected though, label it.
		if (layout.yaxis?.title?.length === 1) {layout.yaxis.title = layout.yaxis.title[0]}

		function obtainGroupSplitPoints(items, wAxis, ...axes) {
			let groups = {}

			if (!wAxis) {
				groups["Group 1"] = obtainGroupPoints(items, ...axes)
			}
			else {
				let points = obtainGroupPoints(items, ...axes, wAxis)

				points.forEach((point) => {
					let wAxis = point.pop()
					if (!groups[wAxis]) {
						groups[wAxis] = []
					}
					else {
						groups[wAxis].push(point)
					}
				})
			}

			return groups
		}

		if (graphType === "Violin Plot") {
			let groups = obtainGroupSplitPoints(items, axes.w, axes.x, axes.y)

			let props = Object.keys(groups)
			let useSplitViolin = (props.length === 2)

			Object.assign(layout, {
				violinmode: useSplitViolin ? "overlay" : "group",
				violingap: 0,
				violingroupgap: 0
			})

			for (let groupName in groups) {
				let points = groups[groupName]

				let info = {
					type: 'violin',
					x: [],
					y: [],
					name: groupName,
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

				if (useSplitViolin && groupName === props[1]) {
					if (info.side === "positive") {info.side = "negative"}
					else if (info.side === "negative") {info.side = "positive"}
					info.pointpos = -info.pointpos
				}

				points.forEach(([x,y]) => {
					info.x.push(x)
					info.y.push(y)
				})

				data.push(info)
			}
		}
		else if (graphType === "Scatter Plot") {
			let CI = 0.95
			let Z = percentile_z(1 - ((1 - CI) / 2))

			let yCount = axes.y.length

			axes.y.forEach((yProp) => {
				let groups = obtainGroupSplitPoints(items, axes.w, axes.x, yProp)
				let groupCount = Object.keys(groups).length

				for (let groupName in groups) {
					let points = groups[groupName]

					let name = yProp
					if (groupCount > 1) {
						name = groupName + "/" + name
					}

					let domain = [points[0][0], points[points.length - 1][0]]

					function round(num, places = 3) {
						let mult = 10 ** places
						return Math.round(num * mult) / mult
					}

					let info = {
						x: [],
						y: [],
						mode: 'markers',
						type: 'scatter',
						name,
						marker: { size: 12, color: graphColors.shift() },
						//TODO: Consider moving Pearson and Spearman to linear regression line.
						hovertemplate: `(%{x}, %{y})<br>Pearson: ${round(pearsonCorrelation(points))}<br>Spearman: ${round(spearmanCorrelation(points))}`
					}

					points.forEach(([x,y]) => {
						info.x.push(x)
						info.y.push(y)
					})

					data.push(info)

					axes.regression.forEach((type) => {
						try {
							//TODO: Zero values break exponential and power law.

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
							else if (type === "LOESS") {
								//TODO: Allow customizing span.
								let options = {
									span: Math.min(Math.max(3.1 / info.x.length, 0.3), 1), //Between 0.3 and 1 - raise to achieve at least 3 points.
									band: CI, //Band uses confidence intervals just like our code (confirmed by reading the LOESS source)
									degree: 1
								}
								console.log(options.span, info.x.length)
								let model = new Loess({
									x: info.x,
									y: info.y
								}, options)
								result = model.predict()
							}
							else {
								console.error("Unknown Type", type)
								return
							}

							console.log(points, result)

							let reginfo = {
								x: [],
								y: [],
								type: 'line',
								opacity: 0.75,
								line: {
									width: 4,
									color: info.marker.color
								},
							}
							data.push(reginfo)

							if (type === "LOESS") {
								reginfo.name = `${type} ${name}`,
								info.x.forEach((x, index) => {
									let fittedY = result.fitted[index]

									reginfo.x.push(x)
									reginfo.y.push(fittedY)
								})
							}
							else {
								reginfo.name = `${type} Reg ${name}`,
								reginfo.hovertemplate = `${result.string}<br>r^2 = ${Math.round(result.r2 * 100)/100}<br>(%{x}, %{y})`

								//Calculate and render regression lines.
								let pointCount = 400 //Number of points that make up regression line.
								let range = domain[1] - domain[0]
								let increment = range / pointCount

								//Go a bit beyond the domain.
								//TODO: Consider going FAR beyond (like 2x), and setting zauto, minm and max
								let startPos = domain[0] - range * 0.01
								let endPos = domain[1] + range * 0.01

								//We'll go an extra increment further.
								for (let x=startPos;x<=endPos;x+=increment) {
									reginfo.x.push(x)
									reginfo.y.push(result.predict(x)[1]) //Predict returns an [x,y] array.
								}
							}

							if (config.order === 1 || type === "LOESS") {
								let text = []
								let moeinfo = {
									x: [],
									y: [],
									text,
									type: 'line',
									fill: "tozerox",
									fillcolor: info.marker.color + (64).toString(16).padStart(2, "0"), //Add opacity to the color (0 - 255).
									line: {
										color: "transparent"
									},
									hovertemplate: `%{text} (CI=${CI * 100}%)<br>(%{x}, %{y})`
								}

								let moeGen;
								if (config.order === 1) {
									moeinfo.name = `${type} Reg ${name}`
									moeGen = marginOfError(points, 0, 1) //0 and 1 are properties (0 for x, 1 for y).
								}
								else if (type === "LOESS") {
									moeinfo.name = `${type} ${name}`
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

										let moe;
										if (config.order === 1) {
											moe = moeGen(x) * Z
										}
										else {
											moe = result.halfwidth[indexToUse]
										}
										pointText += `<br>MOE: ${moe}`
										text.push(pointText)

										moeinfo.x.push(x)
										moeinfo.y.push(y + moe * mult)
									}
								})

								//Duplicate the first value - close the shape.
								moeinfo.x.push(moeinfo.x[0])
								moeinfo.y.push(moeinfo.y[0])
								moeinfo.text.push(moeinfo.text[0])

								data.push(moeinfo)
							}
						}
						catch (e) {
							console.error(e)
						}
					})
				}
			})
		}
		else if (graphType === "3D Scatter Plot") {
			let groups = obtainGroupSplitPoints(items, axes.w, axes.x, axes.y, axes.z)

			Object.assign(layout, {
				margin: {
					l: 0,
					r: 0,
					b: 0,
					t: 0
				}
			})

			for (let groupName in groups) {
				let points = groups[groupName]

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

				points.forEach(([x,y,z]) => {
					info.x.push(x)
					info.y.push(y)
					info.z.push(z)
				})

				data.push(info)
			}
		}
		else if (graphType === "Correlation Table") {
			console.log(type)
			let type = axes.y

			//Default plotly RdBu colorscale
			var colorscaleValue = [
				[0, 'rgb(5,10,172)'], [0.35, 'rgb(106,137,247)'],
				[0.5, 'rgb(190,190,190)'], [0.6, 'rgb(220,170,132)'],
				[0.7, 'rgb(230,145,90)'], [1, 'rgb(178,10,28)']
			]

			let topDivisor = 0.01 //The very top of the colorscale will be used for the center line.
			colorscaleValue.forEach((item) => {
				item[0] /= (1 + topDivisor)
			})

			colorscaleValue.push([1, "rgb(0,0,0)"])

			let info = {
				z: [],
				type: 'heatmap',
				hoverongaps: false,
				zauto: false,
				zmin: -1,
				zmax: 1 + topDivisor * 2,
				colorscale: colorscaleValue,
			}
			info.x = info.y = axes.x

			axes.x.forEach((x1) => {
				let arr = []
				info.z.push(arr)
				axes.x.forEach((x2) => {
					if (x1 === x2) {
						arr.push(99) //Correlates perfectly with itself - TODO: Should we color differently or leave blank to avoid confusion?
					}
					else {
						let points = obtainGroupPoints(items, x1, x2)

						let corr;
						if (type === "Pearson") {
							corr = pearsonCorrelation(points)
						}
						else if (type === "Spearman") {
							corr = spearmanCorrelation(points)
						}

						arr.push(corr)
					}
				})

				data.push(info)
			})
		}
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
			else if (info.allow instanceof Array) {
				params.push(info.allow)
			}
			else {
				throw "Unknown Allow " + info.allow
			}

			params.push(info.multiple)
			params.push(function(res) {
				axes[axis] = res
				genGraph()
			})

			let elem = axisSelector(...params, axes[axis] = axes[axis] || info.preset)
			axisSelectorDiv.appendChild(elem)
		})

		if (graphInfo.regression) {
			//TODO: Add regression.

			//TODO: Replace Cubic and Quartic with Polynomial (arbitrary base) - maybe replace quadratic and linear as well.
			//TODO: Allow base selection for Logarithmic (even though it doesn't really matter)
			//TODO: Re-add "LOESS"
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
	if (!arr) {return}

	try {
		arr = JSON.parse(arr)
		console.log(arr)
		arr.forEach((obj) => {
			graphsDiv.appendChild(createGraphComponent(obj))
		})
	}
	catch (e) {console.error("Error loading graphlink", e)}
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

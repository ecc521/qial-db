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
			multiple: false
		},
		y: {
			allow: "numeric",
			multiple: false
		},
		z: {
			allow: "all",
			multiple: false
		}
	}
}

let graphTypeSelector = document.createElement("select")
for (let prop in graphOptions) {
	let option = document.createElement("option")
	option.value = prop
	option.innerHTML = prop
	graphTypeSelector.appendChild(option)
}

graphsDiv.appendChild(graphTypeSelector)

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

			div.appendChild(label)
			div.appendChild(box)

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
	console.log(axes)
	let graphType = graphTypeSelector.value
	if (graphType === "Violin") {
		let groups = {}
		items.forEach((item) => {
			let val = item[axes[2]]
			//If there isn't a z axis, this still works, the only z is "undefined" (and with only one z, labels aren't displayed)
			if (axes[2] !== undefined && val === undefined) {return}
			if (!groups[val]) {groups[val] = []}
			groups[val].push(item)
		})

		for (let prop in groups) {
			let groupItems = groups[prop]
			groups[prop] = {
				data: groupItems.map((item) => {
					let xVal = item[axes[0]]
					let yVal = item[axes[1]]

					if (xVal === undefined || yVal === undefined) {
						return undefined
					}

					return {
						x: [xVal],
						y: [yVal]
					}
				}).filter((item) => {return item}) //Remove undefined items
			}
		}

		produceGraph(plotlyContainer, {
			groups,
			xAxisTitle: axes[0],
			yAxisTitle: axes[1],
		})
	}
	else {throw "Unsupported graphType " + graphType}
}
window.addEventListener("searchProcessed", genGraph)

let axisSelectorDiv = document.createElement("div")
graphsDiv.appendChild(axisSelectorDiv)

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
graphTypeSelector.addEventListener("change", setGraphOptions)
setGraphOptions()


let plotlyContainer = document.createElement("div")
graphsDiv.appendChild(plotlyContainer)

function produceGraph(div, {
	groups,
	xAxisTitle = "",
	yAxisTitle = "",
	title = "Violin Plot w/ Filters",
}) {
	let data = []
	let props = Object.keys(groups)
	let useSplitViolin = (props.length === 2)

	let layout = {
		title: title,
		violinmode: useSplitViolin ? "overlay" : "group",
		yaxis: {
			title: yAxisTitle,
		},
		xaxis: {
			title: xAxisTitle
		},
		violingap: 0,
		violingroupgap: 0
	}

	props.forEach((prop, index) => {
		let group  = groups[prop]

		let info = {
			type: 'violin',
			x: [],
			y: [],
			legendgroup: prop,
			scalegroup: prop,
			name: prop,
			jitter: 0.05,
			box: {
				visible: true
			},
			line: {
				color: group.color
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

	console.log(data)
	console.log(layout)

	Plotly.newPlot(div, data, layout, {
		responsive: true,
	})
}

module.exports = {genGraph, graphsDiv}

const produceGraph = require("./graphs.js")

let search = document.getElementById("search")

let infoText = "";

let searchDropdown = document.createElement("div")
searchDropdown.id = "searchDropdown"
search.appendChild(searchDropdown)

let searchOptions = document.createElement("div")
search.appendChild(searchOptions)

let expanded;
function setExpanded(expand = expanded) {
	expanded = expand
	if (!expand) {
		searchOptions.style.display = "none"
		searchDropdown.innerHTML = `<span>Search Filters/Graphs (Click to Expand)</span><span>${infoText}</span><span>⬇︎</span>`
	}
	else {
		searchOptions.style.display = ""
		searchDropdown.innerHTML = `<span>Search Filters/Graphs (Click to Collapse)</span><span>${infoText}</span><span>⬆︎</span>`
	}
}
setExpanded(true)

searchDropdown.addEventListener("click", function() {
	setExpanded(expanded = !expanded)
})

let searchFilters = [] //Functions to filter list through

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

function generateSearchOptions(items) {
	let options = [
		{
			optionName: "type",
			type: "of",
			displayName: "Data Type"
		},
		{
			optionName: "Modality",
			type: "of"
		},
		{
			optionName: "DiseaseModel",
			type: "of"
		},
		{
			optionName: "Sex",
			type: "of"
		},
		{
			optionName: "Genotype",
			type: "of"
		},
		{
			optionName: "Image Count",
			type: "of",
		},
		{
			optionName: "weight",
			type: "range",
			convertFrom: Number,
			displayName: "Weight"
		},
		{
			optionName: "weight_at_sacrifice",
			type: "range",
			convertFrom: Number,
			displayName: "Weight @ Sacrifice"
		},
		{
			optionName: "DOB",
			type: "range",
			convertFrom: function(a) {return new Date(a).getTime()},
			displayName: "Date of Birth"
		}
	]

	//Currently, of filters only support strings - TODO: Is this still true? Test it when needed.
	options.forEach(({optionName, type, convertFrom, displayName = optionName}) => {

		let itemBar = document.createElement("div")
		itemBar.className = "searchItemBar"

		let itemBarInfo = document.createElement("span")
		itemBarInfo.innerHTML = `${displayName}: `
		itemBar.appendChild(itemBarInfo)

		searchOptions.appendChild(itemBar)

		//TODO: Disable all other checkboxes when this is on in the searchFilter.
		//We'll show the difference that pushing a single checkbox would make as a +/- X (ex, +9 or -2).
		let enabledCheckbox = createCheckbox()
		enabledCheckbox.addEventListener("change", processSearch)
		itemBar.appendChild(enabledCheckbox)

		let enabledLabel = createLabel(enabledCheckbox)
		itemBar.appendChild(enabledLabel)

		//Extract all the different properties and the amount of times that they occur.
		function getPossibilities(items) {
			let possibilities = {}
			items.forEach((item) => {
				if (item[optionName] === undefined || item[optionName] === "") {return}

				if (!possibilities[item[optionName]]) {
					possibilities[item[optionName]] = 0
				}
				possibilities[item[optionName]]++
			})
			return possibilities
		}

		let selects;
		if (type === "range") {
			selects = [document.createElement("select"), document.createElement("select")]
			selects.forEach((select) => {
				select.addEventListener("change", processSearch)
			});
		}

		let optionElems = {}

		function obtainOptions() {
			let obj = {}
			for (let optionName in optionElems) {
				obj[optionName] = optionElems[optionName].checkbox.checked

			}
			return obj
		}

		let searchFilter;

		if (type === "of") {
			searchFilter = function searchFilter(items, searchEnabled = enabledCheckbox.checked, options = obtainOptions()) {
				if (!searchEnabled) {return items}
				return items.filter((item) => {
					return options[item?.[optionName]]
				})
			}
		}
		else if (type === "range") {
			searchFilter = function searchFilter(items, searchEnabled = enabledCheckbox.checked, minSelection = selects[0].value, maxSelection = selects[1].value) {
				if (!searchEnabled) {return items}

				if (convertFrom) {
					if (!minSelection) {minSelection = -Infinity}
					else {minSelection = convertFrom(minSelection)}
					if (!maxSelection) {maxSelection = Infinity}
					else {maxSelection = convertFrom(maxSelection)}
				}

				if (maxSelection < minSelection) {
					let temp = maxSelection
					maxSelection = minSelection
					minSelection = temp
				}

				return items.filter((item) => {
					if (item[optionName] === undefined) {return false}

					let value = item[optionName]
					if (convertFrom) {value = convertFrom(value)}
					if (value >= minSelection && value <= maxSelection) {
						return true;
					}
				})
			}
		}
		else {
			console.error("Unknown Type", type)
		}

		function setPossibilities() {
			let currentItems = items

			//Use all filters but this one in order to show how many match the selection options given the selectors already picked. This will then be passed to getPossibilities.
			searchFilters.filter((filter) => {return filter !== searchFilter}).forEach((filter) => {
				currentItems = filter(currentItems)
			})

			//Call with the original items to get the totals - what there would be with no selectors but this one.
			let possibilities = getPossibilities(items)
			let possibilitiesArray = Object.keys(possibilities)

			if (convertFrom) {
				possibilitiesArray = possibilitiesArray.filter((poss) => {return poss}) //Filter blanks from range search. TODO: Suppress all in getPossibilities
				possibilitiesArray = possibilitiesArray.sort((a, b) => {
					return convertFrom(a) - convertFrom(b)
				})
			}

			let currentPossibilities = getPossibilities(currentItems)

			possibilitiesArray.forEach((value) => {
				if (type === "of") {
					let elems = optionElems[value]

					if (!elems) {
						optionElems[value] = elems = {
							checkbox: createCheckbox(),
						}
						elems.checkbox.checked = true //Default to true.
						elems.checkbox.addEventListener("change", processSearch)
						elems.label = createLabel(elems.checkbox)
						itemBar.appendChild(elems.checkbox)
						itemBar.appendChild(elems.label)
					}

					elems.checkbox.disabled = !enabledCheckbox.checked
					elems.label.innerHTML = `${value} (${currentPossibilities[value] || 0})`

				}
				else if (type === "range") {
					;[0,1].forEach((iterationNum) => {
						let label = document.getElementsByName("label" + optionName)[iterationNum]
						if (!label) {
							let label = createLabel()
							label.innerHTML = iterationNum ? "And: ":"Between: "
							label.setAttribute("name", "label" + optionName)
							itemBar.appendChild(label)
							itemBar.appendChild(selects[iterationNum])
						}

						let option = document.getElementsByName(value + optionName)[iterationNum]
						if (!option) {
							option = document.createElement("option")
							option.value = value
							option.setAttribute("name", value + optionName)
							if (iterationNum === 0) {
								selects[iterationNum].appendChild(option)
							}
							else {
								selects[iterationNum].prepend(option)
								option.selected = true //Reselect repeatedly until last is selected.
							}
						}

						//TODO: Should changing one selection change the other?
						let amount = searchFilter(currentItems, true, iterationNum===0?value:undefined, iterationNum===1?value:undefined).length

						option.innerHTML = `${value} (${amount})`
					})
				}

				enabledLabel.innerHTML = `Enable Filter (${searchFilter(currentItems, true).length - currentItems.length})`
			});
		}

		setPossibilities()
		window.addEventListener("searchProcessed", setPossibilities)

		searchFilters.push(searchFilter)
	})
}


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

search.appendChild(graphTypeSelector)

//Generates the selector for an axis.
function axisSelector(props, multiple = false, callback) {
	if (multiple) {
		//Generate checkbox list.
		let div = document.createElement("div")
		let propsObj = {}
		props.forEach((prop) => {
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
		def.selected = true
		select.appendChild(def)

		props.forEach((prop) => {
			let option = document.createElement("option")
			option.value = option.innerHTML = prop
			select.appendChild(option)
		})
		select.addEventListener("change", function() {
			callback(select.value)
		})
		return select
	}
}

let axes;
function genGraph(items) {
	console.log(axes)
	let graphType = graphTypeSelector.value
	if (graphType === "Violin") {
		let groups = {}
		//If there isn't a z axis, this still works, the only z is "undefined" (and with only one z, labels aren't displayed)
		items.forEach((item) => {
			let val = item[axes[2]]
			if (!groups[val]) {groups[val] = []}
			groups[val].push(item)
		})

		for (let prop in groups) {
			let groupItems = groups[prop]
			groups[prop] = {
				data: groupItems.map((item) => {
					return {
						x: [item[axes[0]]],
						y: [item[axes[1]]]
					}
				})
			}
		}

		produceGraph(graphDiv, {
			groups,
			xAxisTitle: axes[0],
			yAxisTitle: axes[1],
		})
	}
	else {throw "Unsupported graphType " + graphType}
}

function setGraphOptions() {
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
			genGraph(animals)
		})

		let elem = axisSelector(...params)
		search.appendChild(elem)
	})
}
graphTypeSelector.addEventListener("change", setGraphOptions)
setGraphOptions()


//TODO: Add the stuff from the other spreadsheet as well. Need to add into the JSON.
let graphDiv = document.createElement("div")
search.appendChild(graphDiv)


function processSearch() {
	let items = window.data
	searchFilters.forEach((filter) => {items = filter(items)})
	drawCards(items)
	infoText = `Displaying ${items.length} of ${window.data.length} Items`
	setExpanded()
	window.dispatchEvent(new Event("searchProcessed"))

	genGraph(items)

	//We will generate graphs based off the filtered items, using the axes specified.



	//Enabling a filter will add it to properties to include in the graph.
	//We will draw based on currentItems
	// let animals = items
	// let groups = {
	// 	"Male": {color: "blue", data: []},
	// 	"Female": {color: "pink", data: []},
	// }
	//
	// animals.forEach((item, i) => {
	// 	if (item.Sex === "male") {groups["Male"].data.push(item)}
	// 	else if (item.Sex === "female") {groups["Female"].data.push(item)}
	// 	else {
	// 		console.warn("Unknown Sex: ", item)
	// 	}
	// });
	//
	// for (let prop in groups) {
	// 	let group = groups[prop]
	// 	group.data = group.data.map((animal) => {
	// 		let weight = animal.weight
	// 		return {
	// 			x: [animal.Genotype || "Unknown"],
	// 			y: [weight]
	// 		}
	// 	})
	// 	console.log(group.data)
	// }
	//
	// produceGraph(graphDiv, {
	// 	groups,
	// 	title: "Animal Weights",
	// 	yAxisTitle: "Weight",
	// })
}

module.exports = {generateSearchOptions, processSearch}

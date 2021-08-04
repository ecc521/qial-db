//const {genGraph, graphsDiv} = require("./graphs.js")

let search = document.getElementById("search")
let infoP = document.createElement("p")
infoP.id = "searchInfo"

window.currentViewLink = document.createElement("a")
currentViewLink.target = "_blank"
currentViewLink.innerHTML = "Sharable link to your current search and graphs"

window.currentParams = new URLSearchParams(window.location.hash.slice(1)) //Used to keep currentViewLink in sync between search.js and graphs.js

search.appendChild(infoP)

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

//Search filter structure:
// {
// 	prop: "Sex",
// 	values: ["male", "female"] //When the search filter is constructed, it's type will be determined.
// }

//.values becomes a getter that returns the array based on selections.
//.filter runs the current filter.

let searchFilters = []

let processedProperties = new Map()
let availableProperties = []
let datalist = document.createElement("datalist")
search.appendChild(datalist)

window.data.forEach((item) => {
	let props = Object.keys(item)
	props.forEach((prop) => {
		if (!processedProperties.has(prop)) {
			if (obtainPropertyValues(prop).length > 0) {
				availableProperties.push(prop)
				let option = document.createElement("option")
				option.value = prop
				option.innerHTML = prop
				datalist.appendChild(option)
			}
			processedProperties.set(prop, true)
		}
	})
})

datalist.id = "availableProperties"

function obtainPropertyValues(prop) {
	return window.data.map((item) => {
		if (item.type !== "animal") {return}
		return item[prop]
	}).filter((item) => {
		return item !== undefined
			&& item !== ""
			&& (typeof item === "number" || typeof item === "string")
	})
}

let searchItemBarCount = 0 //Used to auto-add and auto-delete.
//TODO: Also stop duplicate searchItems.

function searchItemBar(obj = {}) {
	//Prop and values are default values used along with searchFilter
	let prop = obj.prop
	let values = obj.values

	searchItemBarCount++
	let div = document.createElement("div")
	div.className = "searchItemBar"

	let filter;
	let selectSpan = document.createElement("span") //Span containing elements used by searchFilter

	function removeFilter() {
		while (selectSpan.firstChild) {selectSpan.firstChild.remove()}
		if (filter) {
			searchFilters.splice(searchFilters.indexOf(filter), 1)
			filter = null
		}
	}
	function addFilter(prop) {
		console.log("Adding")
		removeFilter()
		filter = searchFilter({prop, values}, selectSpan)
		searchFilters.push(filter)
	}

	//This is used to select the property, the rest is handed with searchFilter.
	let input = document.createElement("input")
	input.placeholder = "Enter Search Property..."
	input.className = "searchPropertySelector"
	input.setAttribute("list", "availableProperties")
	if (prop) {input.value = prop}

	function processInput() {
		console.log("Processing")
		let prop = input.value
		if (!availableProperties.includes(prop)) {
			removeFilter()
			input.style.border = ""
			if (prop === "") {
				//TODO: Remove the other empty filter instead. Then change back to "Clear" instead of "Delete"
				if (searchItemBarCount - 1 > searchFilters.length) {
					searchItemBarCount--
					div.remove()
				}
			}
			else {
				input.style.border = "2px solid red"
			}
		}
		else {
			addFilter(prop)
			if (searchFilters.length === searchItemBarCount) {
				search.appendChild(searchItemBar())
			}
		}
		runSearch()
	}
	input.addEventListener("change", processInput)
	setTimeout(processInput, 0) //setTimeout to prevent newly created searchItemBars from being appended before this, among other issues

	let clear = document.createElement("button")
	clear.innerHTML = "Delete"
	clear.addEventListener("click", function() {
		input.value = ""
		processInput()
	})

	div.appendChild(input)
	div.appendChild(clear)
	div.appendChild(selectSpan)

	return div
}

function searchFilter({prop, values}, elemToAppend) {
	//prop must be defined. values only if constructing from searchlink.
	//We now need to determine what type of filter this is, generate the selectors (default to any provided values), and define getters for values.

	//We define as either numeric or other. Dates go under numeric.
	let obj = {prop}

	let propVals = obtainPropertyValues(prop)

	//Remove all duplicates.
	//TODO: Consider adding the number of each prop that exist to the labels and updating them as new filters are added
	//Like male (19) and female (43)
	propVals = [...new Set(propVals)];

	function allNumeric(arr, convertTo) {
		return arr.every((val) => {
			return !isNaN(convertTo(val))
		})
	}

	let type = "range", convertTo;
	let dateConvert = function(d) {return new Date(d).getTime()}

	if (allNumeric(propVals, Number)) {
		obj.convertTo = Number
	}
	else if (allNumeric(propVals, dateConvert)) {
		obj.convertTo = dateConvert
	}
	else {
		type = "of"
	}

	obj.type = type

	let valueGetters = []
	let elems = []

	if (type === "of") {
		propVals.forEach((value) => {
			let box = createCheckbox()
			//Default to existing values
			if (!values || values.includes(value)) {
				box.checked = true
			}
			let label = createLabel(box)
			label.innerHTML = value
			box.addEventListener("change", runSearch)
			elems.push(box)
			elems.push(label)

			valueGetters.push(function() {
				if (box.checked) {return value}
			})
		})
	}
	else if (type === "range") {
		let converted = propVals.map((val) => {
			return [
				val,
				obj.convertTo(val)
			]
		})

		function createSelect(reverse = false) {
			converted.sort(function(a, b) {
				return a[1] - b[1]
			})
			if (reverse) {converted.reverse()}

			let select = document.createElement("select")
			valueGetters.push(function() {
				return select.value
			})

			let label = createLabel()
			label.innerHTML = reverse ? "And" : "Between"
			elems.push(label)
			elems.push(select)

			converted.forEach((item, index) => {
				let option = document.createElement("option")
				if (index === 0) {
					option.selected = true
				}
				option.value = item[0]
				option.innerHTML = item[0]
				select.appendChild(option)
			})

			select.addEventListener("change", runSearch)
			return select
		}

		let select0 = createSelect()
		let select1 = createSelect(true)

		if (values) {
			select0.value = values[0]
			select1.value = values[1]
		}
	}
	else {console.error("Unknown type", type)}

	elems.forEach(function(elem) {
		elemToAppend.appendChild(elem)
	})

	Object.defineProperty(obj, 'values', {
		get: function() {
			let values = valueGetters
				.map(func => func())
			if (type === "of") {
				return values.filter((val) => {return val !== undefined})
			}
			else if (type === "range") {
				return values
			}
			else {console.error("Unknown Type", type)}
		}
	});

	if (type === "of") {
		obj.filter = function(items) {
			let accepted = obj.values
			return items.filter((item) => {
				return accepted.includes(item[prop])
			})
		}
	}
	else if (type === "range") {
		obj.filter = function(items) {
			let vals = obj.values.map(val => obj.convertTo(val))
			let minVal = Math.min(...vals)
			let maxVal = Math.max(...vals)

			return items.filter((item) => {
				let converted = obj.convertTo(item[prop])
				return converted >= minVal && converted <= maxVal
			})
		}
	}

	obj.toJSON = function() {
		return {
			prop,
			values: obj.values
		}
	}

	return obj
}


function setupFromParams() {
	let params = window.currentParams
	let arr = params.get("search")

	try {
		arr = JSON.parse(arr)
		console.log(arr)
		arr.forEach((obj) => {
			search.appendChild(searchItemBar(obj))
		})
	}
	catch (e) {console.error(e)}
}

setupFromParams()
search.appendChild(searchItemBar())

function runSearch() {
	let items = window.data
	searchFilters.forEach((searchFilter) => {
		items = searchFilter.filter(items)
	})
	window.lastSearchItems = items
	drawCards(items)

	let params = window.currentParams
	let url = new URL(window.location.href)

	params.set("search", JSON.stringify(searchFilters))

	url.hash = params

	infoP.innerHTML = `Displaying ${items.length} of ${window.data.length} Items. `
	currentViewLink.href = url.href
	infoP.appendChild(currentViewLink)
	window.dispatchEvent(new Event("searchProcessed"))
}


module.exports = {runSearch}

let search = document.getElementById("search")

let infoText = "";

let searchDropdown = document.createElement("div")
searchDropdown.id = "searchDropdown"
search.appendChild(searchDropdown)

let searchOptions = document.createElement("div")

let expanded;
function setExpanded(expand = expanded) {
	expanded = expand
	if (!expand) {
		searchOptions.remove()
		searchDropdown.innerHTML = `<span>Search Filters (Click to Expand)</span><span>${infoText}</span><span>⬇︎</span>`
	}
	else {
		search.appendChild(searchOptions)
		searchDropdown.innerHTML = `<span>Search Filters (Click to Collapse)</span><span>${infoText}</span><span>⬆︎</span>`
	}
}
setExpanded(true) //TODO: Default to false.

searchDropdown.addEventListener("click", function() {
	setExpanded(expanded = !expanded)
})

let searchFilters = [] //Functions to filter list through

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
			optionName: "Number of Images",
			type: "of",
			displayName: "Image Count"
		},
		{
			optionName: "weight",
			type: "range",
			convertFrom: Number,
			displayName: "Weight"
		},
		{
			optionName: "DOB",
			type: "range",
			convertFrom: function(a) {return new Date(a).getTime()},
			displayName: "Date of Birth"
		}
	]

	//Currently, of filters only support strings.
	options.forEach(({optionName, type, convertFrom, displayName = optionName}) => {
		// let selects = [document.createElement("select")]
		//
		// let searchFilter;
		// if (type === "of") {
		// 	searchFilter = function searchFilter(items, selection = selects[0].value) {
		// 		return items.filter((item) => {
		// 			if (selection === "") {return true}
		// 			if (item[optionName] === undefined) {return false}
		// 			return item[optionName] === selection
		// 		})
		// 	}
		// }
		// else if (type === "range") {
		// 	selects.push(document.createElement("select"))
		//
		// 	searchFilter = function searchFilter(items, minSelection = selects[0].value, maxSelection = selects[1].value, forceEnable = false) {
		// 		if (minSelection === "" && maxSelection === "" && !forceEnable) {return items} //No search in progress.
		//
		// 		if (convertFrom) {
		// 			if (minSelection === "") {minSelection = -Infinity}
		// 			else {minSelection = convertFrom(minSelection)}
		// 			if (maxSelection === "") {maxSelection = Infinity}
		// 			else {maxSelection = convertFrom(maxSelection)}
		// 		}
		//
		// 		return items.filter((item) => {
		// 			if (item[optionName] === undefined) {return false}
		//
		// 			let value = item[optionName]
		// 			if (convertFrom) {value = convertFrom(value)}
		// 			if (value >= minSelection && value <= maxSelection) {
		// 				return true;
		// 			}
		// 		})
		// 	}
		// }
		//
		// function setPossibilities() {
		// 	let currentItems = items
		//
		// 	//Use all filters but this one in order to show how many match the selection options given the selectors already picked. This will then be passed to getPossibilities.
		// 	searchFilters.filter((filter) => {return filter !== searchFilter}).forEach((filter) => {
		// 		currentItems = filter(currentItems)
		// 	})
		//
		// 	//TODO: We may want both a "Off" and "Has property, but Any". Right now, "Any" is an "Off", which makes for some illogical current - total amount indicators.
		// 	function getPossibilities(items) {
		// 		let possibilities = {
		// 			"": 0
		// 		}
		// 		items.forEach((item) => {
		// 			if (item[optionName] === undefined) {return}
		//
		// 			if (item[optionName] !== "") {
		// 				possibilities[""]++
		// 			}
		// 			if (!possibilities[item[optionName]]) {
		// 				possibilities[item[optionName]] = 0
		// 			}
		// 			possibilities[item[optionName]]++
		// 		})
		// 		console.log(possibilities)
		// 		return possibilities
		// 	}
		//
		// 	//Call with the original items to get the totals - what there would be with no selectors but this one.
		// 	let possibilities = getPossibilities(items)
		//
		// 	let possibilitiesArray = [];
		// 	for (let possibility in possibilities) {
		// 		if (possibility === "") {
		// 			//Move the "From Any" to the front.
		// 			possibilitiesArray.unshift(possibility)
		// 		}
		// 		else {
		// 			possibilitiesArray.push(possibility)
		// 		}
		// 	}
		//
		// 	let iterations = [""]
		// 	if (type === "range") {iterations = ["From ", "To "]}
		//
		// 	iterations.forEach((item, iterationNum) => {
		// 		if (convertFrom) {
		// 			possibilitiesArray = possibilitiesArray.sort((a, b) => {
		// 				return convertFrom(a) - convertFrom(b)
		// 			})
		// 			if (iterationNum === 1) {
		// 				possibilitiesArray.reverse()
		// 				//Move the "From Any" to the front again.
		// 				possibilitiesArray.unshift(possibilitiesArray.pop())
		// 			}
		// 		}
		//
		// 		possibilitiesArray.forEach((value) => {
		// 			let option = document.getElementsByName(value + optionName)[iterationNum]
		// 			if (!option) {
		// 				option = document.createElement("option")
		// 				option.value = value
		// 				option.setAttribute("name", value + optionName)
		// 				selects[iterationNum].appendChild(option)
		// 			}
		// 			let name = item + (value!==""?value:"Any")
		//
		// 			// let amount = possibilities[value] //Already computed, but only works for "of" selectors.
		// 			// if (type === "range") {
		// 			// 	//Pass true for forceEnable, so the search excludes invalid ones.
		// 			// 	amount = searchFilter(items, iterationNum===0?value:undefined, iterationNum===1?value:undefined, true).length
		// 			// }
		// 			//Since i is always zero for of sorts, and all other parameters are undefined, this works for both.
		// 			let currentAmount = searchFilter(currentItems, iterationNum===0?value:undefined, iterationNum===1?value:undefined).length
		//
		// 			option.innerHTML = name + ` (${currentAmount})`
		// 		});
		// 	});
		// }

		let itemBar = document.createElement("div")
		itemBar.className = "searchItemBar"

		let itemBarInfo = document.createElement("span")
		itemBarInfo.innerHTML = `${displayName}: `
		itemBar.appendChild(itemBarInfo)

		searchOptions.appendChild(itemBar)

		function createCheckbox() {
			let box = document.createElement("input")
			box.type = "checkbox"
			return box
		}

		function createLabel(checkbox) {
			let label = document.createElement("label")
			label.addEventListener("click", function() {
				checkbox.click()
			})
			return label
		}

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
				if (item[optionName] === undefined) {return}

				if (!possibilities[item[optionName]]) {
					possibilities[item[optionName]] = 0
				}
				possibilities[item[optionName]]++
			})
			return possibilities
		}

		let optionElems = {}

		function obtainOptions() {
			let obj = {}
			for (let optionName in optionElems) {
				obj[optionName] = optionElems[optionName].checkbox.checked

			}
			return obj
		}

		function searchFilter(items, searchEnabled = enabledCheckbox.checked, options = obtainOptions()) {
			if (!searchEnabled) {return items}
			return items.filter((item) => {
				return options[item?.[optionName]]
			})
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
				possibilitiesArray = possibilitiesArray.sort((a, b) => {
					return convertFrom(a) - convertFrom(b)
				})
			}

			let currentPossibilities = getPossibilities(currentItems)

			possibilitiesArray.forEach((value) => {
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

				enabledLabel.innerHTML = `Enable Filter (${searchFilter(currentItems, true).length - currentItems.length})`


				// let amount = possibilities[value] //Already computed, but only works for "of" selectors.
				// if (type === "range") {
				// 	//Pass true for forceEnable, so the search excludes invalid ones.
				// 	amount = searchFilter(items, iterationNum===0?value:undefined, iterationNum===1?value:undefined, true).length
				// }
				//Since i is always zero for of sorts, and all other parameters are undefined, this works for both.
				//let currentAmount = searchFilter(currentItems, iterationNum===0?value:undefined, iterationNum===1?value:undefined).length
			});
		}




		setPossibilities()
		window.addEventListener("searchProcessed", setPossibilities)
		console.log(searchFilter(items, false), searchFilter(items, true))
		console.log(searchFilter(items, true).length, items.length, searchFilter(items, true).length - items.length)
		//enabledLabel.innerHTML = `Enable Filter (${searchFilter(items, true).length - items.length})`


		// selects.forEach((item, i) => {
		// 	item.addEventListener("change", processSearch)
		// 	itemBar.appendChild(item)
		// });
		searchFilters.push(searchFilter)
	})
}

function processSearch() {
	let items = window.data
	searchFilters.forEach((filter) => {items = filter(items)})
	drawCards(items)
	infoText = `Displaying ${items.length} of ${window.data.length} Items`
	setExpanded()
	window.dispatchEvent(new Event("searchProcessed"))
}

module.exports = {generateSearchOptions, processSearch}

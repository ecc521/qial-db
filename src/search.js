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
setExpanded(true)

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
		// {
		// 	optionName: "weight",
		// 	type: "range",
		// 	convertFrom: Number,
		// 	displayName: "Weight"
		// },
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

function processSearch() {
	let items = window.data
	searchFilters.forEach((filter) => {items = filter(items)})
	drawCards(items)
	infoText = `Displaying ${items.length} of ${window.data.length} Items`
	setExpanded()
	window.dispatchEvent(new Event("searchProcessed"))
}

module.exports = {generateSearchOptions, processSearch}

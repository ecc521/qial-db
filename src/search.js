let search = document.getElementById("search")

let info = document.createElement("p")
info.id = "searchInfo"
search.appendChild(info)

let searchDropdown = document.createElement("div")
searchDropdown.id = "searchDropdown"
search.appendChild(searchDropdown)

let searchOptions = document.createElement("div")

let expanded;
function setExpanded(expand) {
	expanded = expand
	if (!expand) {
		searchOptions.remove()
		searchDropdown.innerHTML = "<span>Search Options</span><span>⬇︎</span>"
	}
	else {
		search.appendChild(searchOptions)
		searchDropdown.innerHTML = "<span>Search Options</span><span>⬆︎</span>"
	}
}
setExpanded(true) //TODO: Default to false

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
		let selects = [document.createElement("select")]

		let searchFilter;
		if (type === "of") {
			searchFilter = function searchFilter(items, selection = selects[0].value) {
				return items.filter((item) => {
					if (selection === "") {return true}
					if (item[optionName] === undefined) {return false}
					return item[optionName] === selection
				})
			}
		}
		else if (type === "range") {
			selects.push(document.createElement("select"))

			searchFilter = function searchFilter(items, minSelection = selects[0].value, maxSelection = selects[1].value, forceEnable = false) {
				if (minSelection === "" && maxSelection === "" && !forceEnable) {return items} //No search in progress.

				if (convertFrom) {
					if (minSelection === "") {minSelection = -Infinity}
					else {minSelection = convertFrom(minSelection)}
					if (maxSelection === "") {maxSelection = Infinity}
					else {maxSelection = convertFrom(maxSelection)}
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

		function setPossibilities() {
			let currentItems = items

			//Use all filters but this one in order to show how many match the selection options given the selectors already picked. This will then be passed to getPossibilities.
			searchFilters.filter((filter) => {return filter !== searchFilter}).forEach((filter) => {
				currentItems = filter(currentItems)
			})

			//TODO: We may want both a "Off" and "Has property, but Any". Right now, "Any" is an "Off", which makes for some illogical current - total amount indicators.
			function getPossibilities(items) {
				let possibilities = {
					"": 0
				}
				items.forEach((item) => {
					if (item[optionName] === undefined) {return}

					if (item[optionName] !== "") {
						possibilities[""]++
					}
					if (!possibilities[item[optionName]]) {
						possibilities[item[optionName]] = 0
					}
					possibilities[item[optionName]]++
				})
				return possibilities
			}

			//Call with the original items to get the totals - what there would be with no selectors but this one.
			let possibilities = getPossibilities(items)

			let possibilitiesArray = [];
			for (let possibility in possibilities) {
				if (possibility === "") {
					//Move the "From Any" to the front.
					possibilitiesArray.unshift(possibility)
				}
				else {
					possibilitiesArray.push(possibility)
				}
			}

			let iterations = [""]
			if (type === "range") {iterations = ["From ", "To "]}

			iterations.forEach((item, iterationNum) => {
				if (convertFrom) {
					possibilitiesArray = possibilitiesArray.sort((a, b) => {
						return convertFrom(a) - convertFrom(b)
					})
					if (iterationNum === 1) {
						possibilitiesArray.reverse()
						//Move the "From Any" to the front again.
						possibilitiesArray.unshift(possibilitiesArray.pop())
					}
				}

				possibilitiesArray.forEach((value) => {
					let option = document.getElementsByName(value + optionName)[iterationNum]
					if (!option) {
						option = document.createElement("option")
						option.value = value
						option.setAttribute("name", value + optionName)
						selects[iterationNum].appendChild(option)
					}
					let name = item + (value!==""?value:"Any")

					// let amount = possibilities[value] //Already computed, but only works for "of" selectors.
					// if (type === "range") {
					// 	//Pass true for forceEnable, so the search excludes invalid ones.
					// 	amount = searchFilter(items, iterationNum===0?value:undefined, iterationNum===1?value:undefined, true).length
					// }
					//Since i is always zero for of sorts, and all other parameters are undefined, this works for both.
					let currentAmount = searchFilter(currentItems, iterationNum===0?value:undefined, iterationNum===1?value:undefined).length

					option.innerHTML = name + ` (${currentAmount})`
				});
			});
		}

		setPossibilities()
		window.addEventListener("searchProcessed", setPossibilities)

		let itemBar = document.createElement("div")
		itemBar.className = "searchItemBar"

		let itemBarInfo = document.createElement("span")
		itemBarInfo.innerHTML = `${displayName}: `
		itemBar.appendChild(itemBarInfo)

		searchOptions.appendChild(itemBar)

		selects.forEach((item, i) => {
			item.addEventListener("change", processSearch)
			itemBar.appendChild(item)
		});
		searchFilters.push(searchFilter)
	})
}

function processSearch() {
	let items = window.data
	searchFilters.forEach((filter) => {items = filter(items)})
	drawCards(items)
	info.innerHTML = `Displaying ${items.length} of ${window.data.length} items`
	window.dispatchEvent(new Event("searchProcessed"))
}

module.exports = {generateSearchOptions, processSearch}

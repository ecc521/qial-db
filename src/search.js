let searchOptions = document.getElementById("searchOptions")
let searchFilters = [] //Functions to filter list through

function generateSearchOptions(items) {
	let options = [
		{
			optionName: "type",
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
			type: "of"
		},
		{
			optionName: "weight",
			type: "range",
			convertFrom: Number,
		},
		{
			optionName: "DOB",
			type: "range",
			convertFrom: function(a) {return new Date(a).getTime()},
		}
	]

	//Currently, of filters only support strings.
	options.forEach(({optionName, type, convertFrom}) => {
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
					let name = item + optionName + " - " + (value!==""?value:"Any")

					let amount = possibilities[value] //Already computed, but only works for "of" selectors.
					if (type === "range") {
						//Pass true for forceEnable, so the search excludes invalid ones.
						amount = searchFilter(items, iterationNum===0?value:undefined, iterationNum===1?value:undefined, true).length
					}
					//Since i is always zero for of sorts, and all other parameters are undefined, this works for both.
					let currentAmount = searchFilter(currentItems, iterationNum===0?value:undefined, iterationNum===1?value:undefined).length

					option.innerHTML = name + ` (${currentAmount} - ${amount} total)`
				});
			});
		}

		setPossibilities()
		window.addEventListener("searchProcessed", setPossibilities)
		selects.forEach((item, i) => {
			item.addEventListener("change", processSearch)
			searchOptions.appendChild(item)
		});
		searchFilters.push(searchFilter)
	})
}

function processSearch() {
	let items = window.data
	searchFilters.forEach((filter) => {items = filter(items)})
	drawCards(items)
	window.dispatchEvent(new Event("searchProcessed"))
}

module.exports = {generateSearchOptions}

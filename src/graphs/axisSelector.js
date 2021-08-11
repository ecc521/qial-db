//Generates the selector for an axis.
function axisSelector(props, multiple = false, callback, initialValue) {
	let div = document.createElement("div")

	if (multiple && props.length < 20) {
		//Show a list of checkboxes (used for selecting regression types right now).
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
	}
	else {
		//Use datalists for search autocomplete.
		let datalist = document.createElement("datalist")
		props.forEach((prop) => {
			let option = document.createElement("option")
			option.value = option.innerHTML = prop
			datalist.appendChild(option)
		})
		datalist.id = "axisList" + Math.random()
		div.appendChild(datalist)

		let selectors = []
		function getVals() {
			let validSelectors = selectors
				.map(input => input.value)
				.filter((value) => {
					return props.includes(value)
				})
			if (multiple) {
				return validSelectors
			}
			else {
				return validSelectors[0] || undefined
			}
		}

		//TODO: Handle duplicates - probably notify user and clear selector or something.
		function createSelector(prefill = "") {
			let input = document.createElement("input")
			input.value = prefill
			input.setAttribute("list", datalist.id)
			input.placeholder = multiple ? "Add Property..." : "Select Property..."
			selectors.push(input)
			div.appendChild(input)

			input.addEventListener("change", function() {
				input.style.border = ""
				if (input.value) {
					if (props.includes(input.value)) {
						if (multiple && getVals().length === selectors.length) {
							createSelector() //Add a new selector.
						}
					}
					else {
						input.style.border = "2px solid red"
					}
				}
				else {
					if (multiple && getVals().length + 1 < selectors.length) {
						//If there are two empty selectors, remove this one.
						selectors.splice(selectors.indexOf(input), 1)
						input.remove()
					}
				}

				callback(getVals())
			})
		}

		//Initialize.
		if (initialValue instanceof Array) {
			initialValue.forEach((prop) => {
				createSelector(prop)
			})
		}
		else if (initialValue) {
			createSelector(initialValue)
		}

		if (multiple || selectors.length === 0) {
			createSelector()
		}
	}

	return div
}

module.exports = axisSelector

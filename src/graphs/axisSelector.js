//Generates the selector for an axis.
function axisSelector(props, multiple = false, callback, initialValue) {
	if (multiple) {
		//Multiple selections for this axis can be made at once.
		//If there are less than 20 options, we'll show a list of checkboxes.
		//Otherwise, we will show a datalist powered input with add/delete UI.

		let div = document.createElement("div")

		if (props.length < 20) {
			//Generate checkbox list.
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
			let datalist = document.createElement("datalist")
			props.forEach((prop) => {
				let option = document.createElement("option")
				option.value = option.innerHTML = prop
				datalist.appendChild(option)
			})
	 		datalist.id = "axisList" + Math.random() //This is a bit excessive...
			div.appendChild(datalist)

			let selectors = []
			function getVals() {
				return selectors
					.map(selector => selector.value)
					.filter((value) => {
						return props.includes(value)
					})
			}

			function createSelector(prefill = "") {
				let input = document.createElement("input")
				input.placeholder = "Select Property..."
				input.value = prefill
				input.setAttribute("list", datalist.id)
				selectors.push(input)
				div.appendChild(input)

				input.addEventListener("input", function() {
					input.style.border = ""
					if (input.value) {
						if (props.includes(input.value)) {
							if (getVals().length === selectors.length) {
								createSelector() //Add a new selector.
							}
						}
						else {
							input.style.border = "2px solid red"
						}
					}
					else {
						if (getVals().length + 1 < selectors.length) {
							//If there are two empty selectors, remove this one. 
							selectors.splice(selectors.indexOf(input), 1)
							input.remove()
						}
					}
				})

				input.addEventListener("change", function() {
					console.log(getVals())
					callback(getVals())
				})
			}

			if (initialValue) {
				initialValue.forEach((prop) => {
					createSelector(prop)
				})
			}
			createSelector()


		}

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

module.exports = axisSelector

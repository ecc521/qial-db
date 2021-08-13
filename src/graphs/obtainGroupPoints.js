const {getLCM} = require("./multiples.js")

//Given groupItems and properties (like "weight"), generate an array of points.
function obtainGroupPoints(groupItems, ...props) {
	let points = []

	loopGroupItems:
	for (let i=0;i<groupItems.length;i++) {
		let item = groupItems[i]

		let propVals = []
		for (let i=0;i<props.length;i++) {
			let prop = props[i]

			let vals = item[prop]

			if (!(vals instanceof Array)) {
				vals = [vals]
			}

			//If there are 0 valid elements in the array for any property, skip this item.
			if (!vals.some((val) => {
				return val !== undefined && val !== ""
			})) {
				continue loopGroupItems;
			}

			propVals.push(vals)
		}

		//propVals contains an array of arrays. Each subarray is a valid value for that specific prop.

		//We will seperate out all properties into namespaces, and within namespaces, use the LCM.
		//This does not work if unassociated properties end up in the same namespace

		let namespaces = {}

		props.forEach((prop, index) => {
			let namespace = ""
			if (prop.indexOf("/") !== -1) {
				namespace = prop.slice(0, prop.indexOf("/"))
			}

			if (!namespaces[namespace]) {
				namespaces[namespace] = []
			}

			namespaces[namespace].push(propVals[index].length)
		})

		//console.log(namespaces, props)

		//Calculates the total number of points needed.
		//We assume that two properties in a namespace are related, and use their LCM -
		//this means that a property with 10, and another with 20 will be combined into 20 points,
		//one of the first corresponding to two of the second.

		let totalPoints = 1
		for (let prop in namespaces) {
			totalPoints *= getLCM(namespaces[prop])
		}

		let itemPoints = []
		for (let i=0;i<totalPoints;i++) {
			itemPoints.push([])
		}

		propVals.forEach((vals) => {
			let repeats = totalPoints / vals.length

			vals.forEach((val, index) => {
				for (let i=index * repeats;i < (index + 1) * repeats; i++) {
					itemPoints[i].push(val)
				}
			})
		})
		points.push(...itemPoints)
	}

	//Filter out points where not all values are defined.
	points = points.filter((point) => {
		return point.every((val) => {
			return val !== undefined && val !== ""
		})
	})

	//Convert values in points to numbers.
	points = points.map((point) => {
		return point.map((val) => {
			if (!isNaN(Number(val))) {
				return Number(val)
			}
			return val
		})
	})

	//Sort points based on x axis.
	//This is used in LOESS regression, and makes it easy for other code to determine domain.
	points.sort((a, b) => {
		return a[0] - b[0]
	})

	console.log(points)

	return points
}

module.exports = obtainGroupPoints

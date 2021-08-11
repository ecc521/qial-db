//Given groupItems and properties (like "weight"), generate an array of points. 
function obtainGroupPoints(groupItems, ...props) {
	let points = []

	for (let i=0;i<groupItems.length;i++) {
		let item = groupItems[i]

		propVals = props.map((prop) => {
			let vals = item[prop]

			if (!(vals instanceof Array)) {
				vals = [vals]
			}

			vals = vals.filter((val) => {
				return val !== undefined && val !== ""
			}).map((val) => {
				//Convert vals to numbers where possible.
				if (!isNaN(Number(val))) {
					return Number(val)
				}
				return val
			})

			return vals
		})

		if (!propVals.every(vals => vals.length > 0)) {
			continue
		}

		//propVals contains an array of arrays. Each subarray is a valid value for that specific prop.

		//TODO:
		//The axes might be related, whereby they should not be compounded (two arrays of 5 => 25 points)
		//but rather paired (each index corresponds with the same index in the other axis)

		let itemPoints = propVals[0].map(val => [val])

		propVals.slice(1).forEach((vals) => {
			if (vals.length === 1) {
				//Perf improvement by not cloning - the vals.length === 1 check isn't necessary.
				itemPoints.forEach((itemPoint) => {
					vals.forEach(val => itemPoint.push(val))
				})
			}
			else {
				let newPoints = []
				itemPoints.forEach((itemPoint) => {
					vals.forEach((val) => {
						let newPoint = itemPoint.slice(0)
						newPoint.push(val)
						newPoints.push(newPoint)
					})
				})
				itemPoints = newPoints
			}
		})
		points.push(...itemPoints)
	}

	//Sort points based on x axis.
	//This is used in LOESS regression, and makes it easy for other code to determine domain.
	points.sort((a, b) => {
		return a[0] - b[0]
	})

	return points
}

module.exports = obtainGroupPoints

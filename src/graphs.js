
function produceGraph({
	div,
	groups,
	title = "Violin Plot",
}) {
	let layout = {
		title: title,
		yaxis: {
			zeroline: false
		},
		violinmode: 'group'
	}

	let data = []
	for (let prop in groups) {
		let group  = groups[prop]

		let info = {
			type: 'violin',
			x: [],
			y: [],
			legendgroup: prop,
			scalegroup: prop,
			name: prop,
			box: {
				visible: true
			},
			line: {
				color: group.color
			},
			meanline: {
				visible: true
			}
		}

		group.data.forEach((data) => {
			data.x.forEach((xVal, i) => {
				let correspondingY = data.y[i]
				if (correspondingY !== undefined && xVal !== undefined) {
					info.x.push(xVal)
					info.y.push(correspondingY)
				}
			});

		});

		data.push(info)
	}

	console.log(data)
	console.log(layout)

	Plotly.newPlot(div, data, layout)
}

let animals = window.data.filter((a) => {return a.type === "animal"})
let groups = {
	"Male": {color: "blue", data: []},
	"Female": {color: "pink", data: []},
	"Unknown": {color: "grey", data: []}
}

animals.forEach((item, i) => {
	if (item.Sex === "male") {groups["Male"].data.push(item)}
	else if (item.Sex === "female") {groups["Female"].data.push(item)}
	else {groups["Unknown"].data.push(item)}
});

for (let prop in groups) {
	let group = groups[prop]
	group.data = group.data.map((animal) => {
		let weight = animal.weight?.[0]  //Is an array due to a data issue.
		console.log(weight)
		return {
			x: [animal.Genotype || "Unknown"],
			y: [weight]
		}
	})
	console.log(group.data)
}


window.cnv = document.createElement("div")
document.body.insertBefore(cnv, document.body.firstChild)

produceGraph({
	groups,
	title: "Animal Weights",
	div: window.cnv
})

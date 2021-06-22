
function produceGraph({
	div,
	groups,
	yAxisTitle = "",
	title = "Violin Plot",
}) {
	let layout = {
		title: title,
		violinmode: 'overlay',
		"yaxis": {
			"title": yAxisTitle,
		}
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
			jitter: 0.05,
			box: {
				visible: true
			},
			line: {
				color: group.color
			},
			meanline: {
				visible: true,
				width: 2
			},
			side: "negative",
			points: "all",
			pointpos: -.5,
			width: 1.5, //Boost width by 50%
			margin: {
				pad: 0
			}
		}

		if (prop === "Female") {
			info.side = "positive"
			info.pointpos = -info.pointpos
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

	Plotly.newPlot(div, data, layout, {
		responsive: true,
	})
}

let animals = window.data.filter((a) => {return a.type === "animal"})
let groups = {
	"Male": {color: "blue", data: []},
	"Female": {color: "pink", data: []},
}

animals.forEach((item, i) => {
	if (item.Sex === "male") {groups["Male"].data.push(item)}
	else if (item.Sex === "female") {groups["Female"].data.push(item)}
	else {
		console.warn("Unknown Sex: ", item)
	}
});

for (let prop in groups) {
	let group = groups[prop]
	group.data = group.data.map((animal) => {
		let weight = animal.weight?.[0]  //Weight can be taken at different times - right now it is all under one "weight" metric. 
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
	yAxisTitle: "Weight",
	div: window.cnv
})

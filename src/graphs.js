
function produceGraph(div, {
	groups,
	xAxisTitle = "",
	yAxisTitle = "",
	title = "Violin Plot w/ Filters",
}) {
	let layout = {
		title: title,
		violinmode: 'group', //group or overlay
		"yaxis": {
			"title": yAxisTitle,
		},
		xaxis: {
			title: xAxisTitle
		},
		violingap: 0,
		violingroupgap: 0
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
			side: "both",
			points: "all",
			pointpos: -.5, //TODO: Compute something that works here - off to the side, but minimally.
			//width: 1.5, //Boost width by 50% - TODO: Setting width doesn't work with violinmode group (it acts as if violinmode is overlay).
			//Boosting width also causes single points to overflow massively.
			margin: {
				pad: 0
			}
		}

		if (prop === "Female") {
			if (info.side === "positive") {info.side = "negative"}
			else if (info.side === "negative") {info.side = "positive"}
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

module.exports = produceGraph

function calcMean(arr, prop) {
	return arr.reduce((total, item) => {
		if (prop !== undefined) {item = item[prop]}
		return total + item
	}, 0) / arr.length
}

function calcVariance(arr, prop) {
	//Use n - 1 (Bessel's correction)
	let mean = calcMean(arr, prop)
	let variance = arr.reduce((total, item) => {
		if (prop !== undefined) {item = item[prop]}
		return total + ((item - mean) ** 2)
	}, 0)
	return variance
}

function calcStddev(arr, prop) {
	//TODO: I believe, even with unbiased varaince, there is still a small downwards bias to this.
	//It looks extremely small with increasing sample sizes.
	let variance = calcVariance(arr, prop)
	let stddev = Math.sqrt(variance / (arr.length - 1))
	return stddev
}

//TODO: What do we need to multiply this by for confidence intervals?
function marginOfError(arr, xprop, yprop) {
	if (xprop === undefined || yprop === undefined) {throw "marginOfError requires xprop and yprop"}
	//Reference: https://stats.stackexchange.com/questions/85560/shape-of-confidence-interval-for-predicted-values-in-linear-regression
	let stddev = calcStddev(arr, yprop)
	//TODO: Variance computes mean. Don't compute it twice.
	let xMean = calcMean(arr, xprop)
	let xVariance = calcVariance(arr, xprop)

	return function genMOE(xVal) {
		return stddev * Math.sqrt(
			(1 / arr.length) + ((xVal - xMean) ** 2 / xVariance)
		)
	}
}

//https://stackoverflow.com/a/36577594/10965456
function percentile_z(p) {
    if (p < 0.5) return -percentile_z(1-p);

    if (p > 0.92) {
        if (p == 1) return Infinity;
        let r = Math.sqrt(-Math.log(1-p));
        return (((2.3212128*r+4.8501413)*r-2.2979648)*r-2.7871893)/
               ((1.6370678*r+3.5438892)*r+1);
    }
    p -= 0.5;
    let r = p*p;
    return p*(((-25.4410605*r+41.3911977)*r-18.6150006)*r+2.5066282)/
             ((((3.1308291*r-21.0622410)*r+23.0833674)*r-8.4735109)*r+1);
}


export {
	calcMean,
	calcVariance,
	calcStddev,
	marginOfError,
	percentile_z
}

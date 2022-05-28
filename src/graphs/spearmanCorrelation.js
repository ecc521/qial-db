//https://stackoverflow.com/a/36303302/10965456
//spearmanCorrelation was modified to add let declarations on variables to run in esm modules.
function spearmanCorrelation(multiList, p1, p2){
    let N=multiList[p1].length;
    let order=[];
    let sum=0;

    for(let i=0;i<N;i++){
        order.push([multiList[p1][i], multiList[p2][i]]);
    }

    order.sort(function(a,b){
        return a[0]-b[0]
    });

    for(let i=0;i<N;i++){
        order[i].push(i+1);
    }

    order.sort(function(a,b){
        return a[1]-b[1]
    });

    for(let i=0;i<N;i++){
        order[i].push(i+1);
    }
    for(let i=0;i<N;i++){
        sum+=Math.pow((order[i][2])-(order[i][3]), 2);

    }

    let r=1-(6*sum/(N*(N*N-1)));

    return r;
}

export default function spearmanWrapper(points) {
	//Points is an array of [x, y]
	let obj = {x: [], y: []}
	points.forEach((point) => {
		obj.x.push(point[0])
		obj.y.push(point[1])
	})
	return spearmanCorrelation(obj, "x", "y")
}

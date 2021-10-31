def obtainPosition(axis):
    if axis == "x": return 0;
    elif axis == "y": return 1;
    elif axis == "z": return 2;
    else: raise NotImplementedError

#Obtain arguments for slicing.
def obtainSliceArgs(axis, sliceParams, numberOfAxes):
    paramPosition = obtainPosition(axis)
    arr = []
    for i in range(numberOfAxes):
        if i == paramPosition:
            arr.append(slice(*sliceParams))
        else:
            arr.append(slice(None))
    return tuple(arr)

def shapeNumAxes(shape, axes):
    #Make sure shape has at least 4 dimensions - pad with ones.
    shape = list(shape)
    while (len(shape) < 4):
        shape.append(1)

    #Collapse dimensions greater than 4 into channel dimension - CloudVolume supports 3 dimensions plus channel dimension.
    while (len(shape) > 4):
        shape[3] *= shape.pop()

    return shape

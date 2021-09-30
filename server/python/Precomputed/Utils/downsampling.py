import numpy as np

def averagingDownsample(arr, factor_x = 2, factor_y = 2, factor_z = 2, restoreDtype = True):
    #Average voxels. The factor must evenly divide all components (TODO: Padding?)

    #Using methodoloy explained in https://scipython.com/blog/binning-a-2d-array-in-numpy/
    #We'll allow the float64 default intermediates. We can't allow an overflow.
    initialDtype = arr.dtype

    reshapeArgs = [int(arr.shape[0]/factor_x), factor_x, int(arr.shape[1]/factor_y), factor_y, int(arr.shape[2]/factor_z), factor_z]
    if arr.shape[3:]:
        reshapeArgs.append(arr.shape[3])

    arr = arr.reshape(*reshapeArgs).mean(1).mean(2).mean(3)

    if (restoreDtype): return arr.astype(initialDtype)
    else: return arr


def majorityDownsample(arr, factor_x = 2, factor_y = 2, factor_z = 2):
    #TODO: This is SLOW!!!

    #The factor must evenly divide all components as well.
    #Return most common single voxel. Used for segmentations
    #If two different voxels are just as common, simply pick the first.
    #No great way to handle it, but better than leaving empty or doing something weird.

    shapeArgs = list(arr.shape)
    shapeArgs[0] = int(shapeArgs[0]/factor_x)
    shapeArgs[1] = int(shapeArgs[1]/factor_y)
    shapeArgs[2] = int(shapeArgs[2]/factor_z)
    newArr = np.empty(shapeArgs, dtype=arr.dtype) #Uninitialized array.

    for x in range(newArr.shape[0]):
        for y in range(newArr.shape[1]):
            for z in range(newArr.shape[2]):

                scaleX = x * factor_x
                scaleY = y * factor_y
                scaleZ = z * factor_z

                slice = arr[scaleX:scaleX + factor_x, scaleY:scaleY + factor_y, scaleZ:scaleZ + factor_z]
                values, counts = np.unique(slice, return_counts=True)

                newArr[x, y, z] = values[np.argmax(counts)]

    return newArr

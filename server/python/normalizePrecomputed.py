from __future__ import print_function
import sys

import os
import gzip
import brotli
import numpy

import json #For exporting norm.json

#TODO: Is there a better way to normalize besides just taking a percentile range?
#ImageJ seems to do something similar to this (linear with some fully saturated)
#But whatever their algorithm is for determining the cutoff is MUCH more comprehensive.

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

#We need to do some processing here, and normalize the range of float32s to [0,1]
#It's OK is some datapoints go over, and also OK if things are darker than they should be because of outliers.

def normalizeDirectory(dir, divisor):
    #Upscale all values linearly.
    items = os.listdir(dir)

    for name in items:
        if (name.endswith(".gz")):
            path = os.path.join(dir, name)

            f = gzip.open(path)
            data = bytearray(f.read()) #It's not writable without sending through bytearray, which might involve an extra copy.
            f.close()

            #Create view over data.
            arr = numpy.frombuffer(data, dtype="float32")

            for i in range(len(arr)):
                arr[i] = arr[i]/divisor

            eprint("Processing", path)

            #We'll output these in brotli - usually the same size, maybe slightly smaller, on level 9. (any higher would be too slow)
            brotliOutputPath = path[0:-3] + ".br" #Remove the .gz extension

            with open(brotliOutputPath, "wb") as fd:
                fd.write(brotli.compress(data, quality = 9))
                fd.close()

            os.remove(path)



#Not by any means ideal, but it's decent.
#TODO: We need to obtain the minimum value too.
def getNormalizationValue(dir, percentile = 99.99):
    items = os.listdir(dir)

    divisor = 1 / (1 - (percentile / 100))

    type = "float32"

    #Init empty arrays.
    topArr = numpy.frombuffer(bytearray(), dtype=type)
    bottomArr = numpy.frombuffer(bytearray(), dtype=type)

    for name in items:
        if (name.endswith(".gz")):
            path = os.path.join(dir, name)

            f = gzip.open(path)
            data = bytearray(f.read()) #It's not writable without sending through bytearray, which might involve an extra copy.
            f.close()

            #Create view over data.
            arr = numpy.frombuffer(data, dtype=type)

            #TODO: Clamp much better. We want to clamp to exactly the percentage of the voxels that fit in the percentile
            #Right now, we merely clamp to an entire cube at the current resolution. We should calculate the total number of voxels instead.
            #As is, we sort more than needed, and with enough cubes, the percentile could be wrong (if the percentile didn't fit inside the arrays -
            #for example, 50th percentile of 10000 different cubes of 64 voxels - we respond with the 64th highest voxel)
            clampTo = max(len(topArr), len(arr))

            #We're merging already sorted lists here - there's probably a faster sort algorithm if needed.
            arr.sort() #Sorts ascending.

            topArr = numpy.concatenate([topArr, arr])
            bottomArr = numpy.concatenate([bottomArr, arr])

            topArr.sort()
            bottomArr.sort()

            topArr = topArr[-clampTo:]
            bottomArr = bottomArr[:clampTo]


    #Find the number of items per cube, multiply by cubes, and divide by divisor to find the voxel index.
    index = round(len(topArr) * len(items) / divisor)

    return {"min": float(bottomArr[0]), "lower": float(bottomArr[index]), "upper": float(topArr[-index]), "max": float(topArr[-1])}



def normalizeDir(dir):
    items = os.listdir(dir)

    leastItems = 99999999999999
    name = ""

    for dirname in items:
        #Use the lowest resoltuion to calculate normalization value - it's much faster.
        #TODO: We're using the lowest resolution, which means min and max are going to be off.
        #Acceptable for normalization values, but really shouldn't be the case with min and max.
        #Maybe we could use the min and max from the original NIFTI file if specified, but not all files specify it.
        if (dirname.endswith("um")):
            dirPath = os.path.join(dir, dirname)
            itemAmount = len(os.listdir(dirPath))
            if itemAmount < leastItems:
                leastItems = itemAmount
                name = dirPath

    eprint(name, leastItems)
    normVals = getNormalizationValue(name)

    #Write the results to a file.
    res = open(os.path.join(dir, "norm.json"), "w")
    res.write(json.dumps(normVals))
    res.close()


if (__name__ == "__main__"):
    normalizeDir(sys.argv[1])

from __future__ import print_function
import sys

import os
import gzip
import numpy

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

            # outputPath = path[0:-3] #Remove the .gz extension

            # of = open(outputPath, "wb")
            # of.write(data)
            # of.close()

            eprint("Processing", path)
            of = gzip.open(path, "wb", compresslevel = 9)
            of.write(data)
            of.close()



#Not by any means ideal, but it's decent.
def getNormalizationValue(dir, percentile = 99.99):
    items = os.listdir(dir)

    divisor = 1 / (1 - (percentile / 100))

    finalArr = numpy.frombuffer(bytearray(), dtype="float32")
    #The array will be clamped to the max of its current size and that of the block.

    for name in items:
        if (name.endswith(".gz")):
            path = os.path.join(dir, name)

            f = gzip.open(path)
            data = bytearray(f.read()) #It's not writable without sending through bytearray, which might involve an extra copy.
            f.close()

            #Create view over data.
            arr = numpy.frombuffer(data, dtype="float32")

            clampTo = max(len(finalArr), len(arr)) #TODO: Clamp much better.

            finalArr = numpy.concatenate([finalArr,arr])

            finalArr.sort()

            finalArr = finalArr[-clampTo:]
            eprint(finalArr)

    index = -round(len(finalArr) / (divisor / len(items)))
    return finalArr[index]


def normalizeDir(dir):
    items = os.listdir(dir)

    leastItems = 99999999999999
    name = ""

    for dirname in items:
        #Use the lowest resoltuion to calculate normalization value - it's much faster.
        if (dirname.endswith("um")):
            dirPath = os.path.join(dir, dirname)
            itemAmount = len(os.listdir(dirPath))
            if itemAmount < leastItems:
                leastItems = itemAmount
                name = dirPath

    eprint(name, leastItems)

    normVal = getNormalizationValue(name)
    eprint(normVal)

    if (normVal < 0.5):
        #Only normalize if it's way low.
        for dirname in items:
            if (dirname.endswith("um")):
                dirPath = os.path.join(dir, dirname)
                eprint("Norming ", dirPath)
                normalizeDirectory(dirPath, normVal)

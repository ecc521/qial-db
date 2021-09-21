#Calculate top and bottom percentiles with
#Pass 99.9 for 99.9th and 0.01th, etc.
#TODO: There must be a way to optimize this further. This isn't any faster than a pure sort (though it's similar)

import numpy as np
import math

def getPercentiles(arr, percentile):
    if (percentile < 50): percentile = 100 - percentile #If below 50, flip. We were passed the lower percentile, not the upper one.

    divisor = 1 / (1 - (percentile / 100))

    increment = amountForPercentile = math.ceil(arr.size / divisor)

    #Now iterate through the array in relatively small blocks.

    flatArr = arr.flat
    bottomArr = np.empty(amountForPercentile + increment, dtype=arr.dtype)
    bottomArr.fill(np.finfo(arr.dtype).max)
    topArr = np.empty(amountForPercentile + increment, dtype=arr.dtype)
    topArr.fill(np.finfo(arr.dtype).min)

    index = 0
    while index < arr.size:
        #.sort() is least to greatest.
        currentSlice = flatArr[index:index + increment]
        index += increment

        #Boolean Indexing filtering - remove anything clearly outside of range.
        currentSlice = currentSlice[(currentSlice > topArr[-amountForPercentile]) | (currentSlice < bottomArr[amountForPercentile - 1])]
        currentSlice.sort(kind="mergesort")

        if (currentSlice.shape[0] == 0):
            continue

        bottomArr[-len(currentSlice):] = currentSlice
        bottomArr.sort(kind="mergesort")

        topArr[:len(currentSlice)] = currentSlice
        topArr.sort(kind="mergesort")

    return {"min": float(bottomArr[0]), "lower": float(bottomArr[amountForPercentile - 1]), "upper": float(topArr[-amountForPercentile]), "max": float(topArr[-1])}

#Streaming percentile calculation.

import numpy as np
import math

#TODO: There must be a way to optimize this further. This is slower than simply sorting the entire original array.

class PercentileCalculator:
    #Increment: Size of one slice (we'll process percentiles as individual sizes are added).
    def __init__(self, totalSize, dtype, percentile = 99.99):

        #Calculate top and bottom percentiles with
        #Pass 99.9 for 99.9th and 0.01th, etc.
        if (percentile < 50): percentile = 100 - percentile #If below 50, flip. We were passed the lower percentile, not the upper one.

        divisor = 1 / (1 - (percentile / 100))

        self.amountForPercentile = amountForPercentile = math.ceil(totalSize / divisor)

        if (np.issubdtype(dtype, np.integer)):
            max = np.iinfo(dtype).max
            min = np.iinfo(dtype).min
        else:
            max = np.finfo(dtype).max
            min = np.finfo(dtype).min

        #Prefill min with lowest value possible.
        self.bottomArr = bottomArr = np.empty(amountForPercentile, dtype=dtype)
        bottomArr.fill(max)

        #Prefill max with highest value possible.
        self.topArr = topArr = np.empty(amountForPercentile, dtype=dtype)
        topArr.fill(min)


    @property
    def result(self):
        bottomArr = self.bottomArr
        topArr = self.topArr
        amountForPercentile = self.amountForPercentile

        dict = {}
        dict["min"] = float(bottomArr[0])
        dict["max"] = float(topArr[-1])

        dict["lower"] = float(bottomArr[amountForPercentile - 1])
        dict["upper"] = float(topArr[-amountForPercentile])

        return dict


    def addBlock(self, arr):
        #Dimensions of the block do not matter.
        #Does not modify the input block.
        bottomArr = self.bottomArr
        topArr = self.topArr
        amountForPercentile = self.amountForPercentile

        currentVals = self.result
        newItems = arr.flat

        #Boolean Indexing filtering - remove anything clearly outside of range.
        newItems = newItems[(newItems > topArr[-amountForPercentile]) | (newItems < bottomArr[amountForPercentile - 1])]
        newItems.sort(kind="mergesort")

        if (newItems.shape[0] == 0):
            return

        bottomArr = np.concatenate([bottomArr, newItems])
        topArr = np.concatenate([topArr, newItems])

        bottomArr.sort(kind="mergesort")
        topArr.sort(kind="mergesort")

        self.topArr = topArr[-amountForPercentile:]
        self.bottomArr = bottomArr[:amountForPercentile]

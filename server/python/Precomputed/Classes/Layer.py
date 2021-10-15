import numpy as np
import math

from Utils.axes import obtainPosition, obtainSliceArgs, shapeNumAxes
from Utils.downsampling import averagingDownsample, majorityDownsample
from Classes.PercentileCalculator import PercentileCalculator


#TODO: Whenever the highest resolution layer writes a chunk, it should downsample and provide those slices to the downsampled layers.
#This works as long as we don't downsample by something not a factor of the chunk size.
class Layer:
    def __init__(self, vol, mip, axis, downsamplingType, lastSliceCallback = None):
        self.lastSliceCallback = lastSliceCallback
        self.vol = vol
        self.mip = mip
        self.axis = axis
        self.downsamplingType = downsamplingType

        #Calculate percentile only for top layer - speed things up slightly.
        #We might want to do a full percentile only on a lower resolution layer, and just do min/max on the top layer.
        #That would reduce the impact of percentile calculation on performance.
        if mip == 0:
            self.percentile = PercentileCalculator(math.prod(vol.mip_shape(mip)), vol.dtype)
        else:
            self.percentile = None

        cacheShapeArgs = [*vol.mip_shape(mip)]

        #Update the shape for the specific channel we are stacking on.
        axisPos = obtainPosition(axis)
        cacheShapeArgs[axisPos] = vol.chunk_size[axisPos]

        self.cacheArr = np.zeros(cacheShapeArgs, dtype=vol.dtype)
        self.currentSlices = 0


    def addChunk(self, chunk):
        #TODO: Right now we assume the input chunk is the full volume dimensions (except for stacking axis).

        #Accepts chunks, downscaling if necessary. Chunks MUST be able to be split into slices.
        #Calls addSlice on the slices.

        vol = self.vol

        #Save current mip to reset afterwards.
        startMip = vol.mip
        vol.mip = self.mip

        downsampleRatio = vol.downsample_ratio.astype(np.int64) #Convert downsampling ratio to integers.
        if self.downsamplingType == "averaging":
            downsampledChunk = averagingDownsample(chunk, *downsampleRatio)

        elif self.downsamplingType == "majority":
            downsampledChunk = majorityDownsample(chunk, *downsampleRatio)

        else:
            raise NotImplementedError("Downsampling type not supported: " + self.downsamplingType)

        #Convert the chunk into slices.
        sliceCount = downsampledChunk.shape[obtainPosition(self.axis)]

        for i in range(sliceCount):
            sliceArgs = obtainSliceArgs(self.axis, (i, i+1), len(downsampledChunk.shape))
            self.addSlice(downsampledChunk[sliceArgs])

        vol.mip = startMip


    def addSlice(self, slice, subLayers = []):
        vol = self.vol

        #Make sure not to change mip.
        startMip = vol.mip
        vol.mip = self.mip

        if self.percentile is not None:
            self.percentile.addBlock(slice)

        slice.shape = shapeNumAxes(slice.shape, 3)

        axisPos = obtainPosition(self.axis)

        shape = vol.shape
        lastSlice = shape[axisPos]
        chunkSize = vol.chunk_size[axisPos]

        currentChunkStart = int(self.currentSlices / chunkSize) * chunkSize
        currentChunkEnd = min(currentChunkStart + chunkSize, lastSlice)

        cacheOffset = self.currentSlices % chunkSize

        self.cacheArr[obtainSliceArgs(self.axis, (cacheOffset, cacheOffset + 1), len(self.cacheArr.shape))] = slice
        self.currentSlices += 1

        returnVal = None #We return anything that we wrote to the volume.

        #requiredSlices is one indexed, currentSlices zero indexed.
        #If we're done with the chunk, write it.
        if (currentChunkEnd == self.currentSlices):
            volumeSlice = obtainSliceArgs(self.axis, (currentChunkStart, currentChunkEnd), len(self.cacheArr.shape))
            cacheSlice = obtainSliceArgs(self.axis, (0, cacheOffset + 1), len(self.cacheArr.shape))
            self.vol[volumeSlice] = returnVal = self.cacheArr[cacheSlice]


        #Write info after last chunk completed.
        #TODO: Run segmentation code with maxVoxelValue.
        if (vol.mip == 0 and self.currentSlices == lastSlice):
            if (self.lastSliceCallback is not None):
                self.lastSliceCallback()
            # vol.commit_info()

        vol.mip = startMip

        return returnVal

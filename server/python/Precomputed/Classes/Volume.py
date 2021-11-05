#Assemble precomputed file from a series of slices
#This allows for stream based processing - keeping a minimum amount of data in memory.

from cloudvolume import CloudVolume
import numpy as np

from Utils.axes import obtainPosition, obtainSliceArgs, shapeNumAxes
from Classes.Layer import Layer

import os
from Utils.thumbnails import generateThumbnailsVolume #TODO: We should generate the thumbnails progressively - as slices are added - rather than at the end.

from Utils.segmentation import segmentVolume

import math
import json


class Volume:
    def __init__(self, output_path, shape, dtype, axis = "z", layerType = "image", resolution = [1, 1, 1], chunk_size = None, label_path = None, colorSpace = "bw"):
        #output_path - Absolute output path for precomputed (directory name)
        #Shape: Shape of image.
        #dtype - Data type of image.
        #axis - axis on which stacking should be done.
        #layerType - image or segmentation. Determines neuroglancer config and downscaling method
        #Resolution - Array of the resolutions for each axis in shape - nanometers. (Used for displaying scale)
        #Chunk size - Size for chunks


        # Round resolution to avoid excessive digits.
        # Use logarithms. Using more digits than needed is fine.
        def computeResolution(res):
            roundingMultiplier = 10 ** max(0, math.ceil(-(math.log10(res) - 3))) #At least 3 more digits than we need.
            return round(res * roundingMultiplier) / roundingMultiplier

        resolution = [computeResolution(res) for res in resolution]


        #Handling 5D+ shapes: Merge dimensions 4+ into the channel dimension - (1,1,1,2,3) becomes (1,1,1,6)
        #We also write the original shape into norm.json.
        #TODO: We should use channel sliders, etc, to effectively recreate the original image.
        #TODO: Color images? We need to detect these somehow.
        originalShape = shape

        #Collapse dimensions 4+ into dimension 4.
        shape = shapeNumAxes(shape, 4)

        self.axis = axis

        targetType = dtype

        #Neuroglancer doesn't support float64, so use float32 instead.
        if (targetType == np.float64):
            targetType = np.float32

        #Set encoding type.
        if (layerType == "image"):
            encoding = "raw"
            downsampling = "averaging"

        elif (layerType == "segmentation"):
            encoding = "compressed_segmentation" #Reduces neuroglancer memory usage.
            downsampling = "majority"

            if (np.issubdtype(targetType, np.signedinteger)):
                #Compressed segmentations must be uint32 or uint64.
                #Raw segmentations may be uint16, or (probably - Neuroglancer added a patch) the equivalent integers.
                size = targetType.itemsize

                if (encoding == "compressed_segmentation"):
                    size = max(size, 4)
                targetType = "uint" + str(size * 8)

            else:
                targetType = "uint64"

        else:
            raise NotImplementedError("Layer type not supported: " + layerType)


        if chunk_size == None:
            #Neuroglancer recommends 64^3 (262144 voxels) to balance request count against file size.
            #In images with lots of channels, especially with larger dtypes, these chunks can end up
            #being 20MB+, which is excessive.

            #Since Neuroglancer currently does not support splitting channels across chunks,
            #We will reduce the chunk size to reduce bandwidth waste.

            #Number of bytes for each 3D voxel (channels * bytes per channel)
            multiplier = shape[3] * np.dtype(targetType).itemsize

            chunk_size = [64, 64, 64]

            #Downscale all dimensions by factors of two until each chunk is under 1MB.
            #This means chunks will be between 1MB and just over 1MB/8 (as we downscale all dimensions at once).
            maxChunkBytes = 2 ** 20 #1MB

            while (math.prod(chunk_size) * multiplier > maxChunkBytes and chunk_size[0] > 1):
                for i in range(len(chunk_size)):
                    chunk_size[i] /= 2


        #Create info file - we won't actually write it to the disk until the image is finished.
        info = CloudVolume.create_new_info(
            num_channels    = shape[3],
            layer_type      = layerType, #image/segmentation
            data_type       = targetType,
            encoding        = encoding, #raw/compressed_segmentation
            resolution      = resolution, #Voxel scaling, units are in nanometers
            voxel_offset    = [0, 0, 0], #TODO: Does this need to be offset to the voxel center?
            # Pick a convenient size for your underlying chunk representation
            chunk_size      = chunk_size, #Chunk size. Power of 2s are fastest. Balance between size and network request count.
            volume_size     = shape[0:3],
        )

        #Create Precomputed Volume
        #progress means show progress bars, etc - nice visualizer, though unnecessary.
        self.vol = vol = CloudVolume("precomputed://file://" + output_path, info=info, progress=True)

        #Determine downscale resolutions.
        #We'll just half until we can't half anymore.
        #TODO: Need some padding abiltiy. Also don't need to downscale ALL the way to the bottom.
        downsampleFactor = 2
        while all(x%downsampleFactor == 0 for x in vol.shape[0:3]):
            vol.add_scale([x*downsampleFactor for x in vol.downsample_ratio]) #Add scale to info file.
            vol.mip += 1

        vol.mip = 0

        self.layers = layers = []
        for mip in vol.available_mips:
            layer = Layer(vol, mip, axis, downsampling)
            layers.append(layer)

        def lastSliceCallback():
            firstLayer = layers[0]

            outputObj = firstLayer.percentile.result
            outputObj["originalShape"] = originalShape
            outputObj["colorSpace"] = colorSpace

            if label_path is not None:
                segmentVolume(vol, output_path, label_path, maxVoxelValue = outputObj["max"])

            f = open(os.path.join(output_path, "norm.json"), "w")
            f.write(json.dumps(outputObj))
            f.close()

            #TODO: If we never finished processing the entire image, and lastSliceCallback was called in finishProcessing, rather than after the last slice,
            #generateThumbnailsVolume currently fills in the missing data with zeros. This should be changed to either crash, or reduce the dimensions
            #of the output thumbnails. 
            generateThumbnailsVolume(vol, os.path.join(output_path, "x.webp"), os.path.join(output_path, "y.webp"), os.path.join(output_path, "z.webp"))

            vol.commit_info()



        layers[0].lastSliceCallback = lastSliceCallback

        #self.finishProcessing will write the info file, generate thumbnails, etc.
        #TODO: self.finishProcessing does NOT flush slices in cache.
        self.finishProcessing = lastSliceCallback



    def addChunk(self, chunk):
        #Convert the chunk into slices.
        sliceCount = chunk.shape[obtainPosition(self.axis)]

        for i in range(sliceCount):
            sliceArgs = obtainSliceArgs(self.axis, (i, i+1), len(chunk.shape))
            self.addSlice(chunk[sliceArgs])


    def addSlice(self, slice):
        #Dispatch this slice to layers.

        #First, make sure slice type matches volume dtype.
        #We may need to convert things like float64 that Neuroglancer doesn't support.
        slice = slice.astype(self.vol.dtype, copy=False)

        layers = self.layers

        firstLayerResult = layers[0].addSlice(slice)

        #If the first layer wrote from cache, then we have something that will downsample into other layers.
        #Pass the other layers what the first layer wrote.

        #TODO: For images that use averagingDownsample (so not segmentations), we can disable restoreDtype and pass the result of one downsample into the next.
        #We'd need some logic here, as well as in Layer.py
        if (firstLayerResult is not None):
            for i in range(1, len(layers)):
                layer = layers[i]
                layer.addChunk(firstLayerResult) #addChunk will downsample.

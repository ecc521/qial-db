from Classes.Volume import Volume
from Utils.axes import obtainPosition
from Utils.axes import obtainPosition, obtainSliceArgs, shapeNumAxes

import nibabel
import numpy as np

import os

#Process NIFTI in chunks.

#Installing indexed-gzip allows for somewhat random access (nibabel automatically detects it).
#Ideally we would be able to use just keep_file_open = True (which is perfectly effecient going forward only),
#However that doesn't work all that well with channels - the channels are stored at the end,
#And if we want to stack on the z axis, that's a problem.

#As is, indexed-gzip won't be perfectly effecient - we'll need to read through every channel for every slice -
#However indexed-gzip should be faster than all the alternatives, except decompressing the entire file to memory (which isn't always an option).


def niftiToPrecomputed(input_path, output_path, label_path):
    nifti = nibabel.load(input_path)
    resolution = nifti.header["pixdim"][1:4] #x, y, and z resolution

    #Units for resolution
    units = nifti.header["xyzt_units"]

    spaceUnits = units % 8
    timeUnits = units - spaceUnits #Not currently used.

    resolutionMultiplier = 1 #Nanometers is default resolution. 
    if (spaceUnits == 3):
        #Micrometers
        resolutionMultiplier = 1000
    elif (spaceUnits == 2):
        #Millimeters
        resolutionMultiplier = 1000 * 1000
    elif (spaceUnits == 1):
        #Meters
        resolutionMultiplier = 1000 * 1000 * 1000
    elif (spaceUnits == 0):
        #Unknown Resolution. Assume nanometers (so change nothing).
        pass;
    else:
        raise NotImplementedError("Unknown Space Units: " + str(spaceUnits))


    resolution = [res * resolutionMultiplier for res in resolution] #Values are nanometers.


    #TODO: Better system for detecting segmentations?
    fileName = os.path.basename(input_path)

    layerType = "image"
    if "label" in fileName.lower():
        layerType = "segmentation"


    # #Segmentations must be converted to unsigned integers.
    # if layerType == "segmentation":
    #     #TODO: This is not a comprehensive list.
    #     if (np.issubdtype(targetType, np.signedinteger)):
    #         size = targetType.itemsize
    #         #Compressed segmentations must be uint32 or uint64.
    #         #Raw segmentations may be uint16.
    #         if (encoding == "compressed_segmentation"):
    #             size = max(size, 4)
    #         targetType = "uint" + str(size * 8)
    #
    #     else:
    #         targetType = "uint64"


    #Obtain array.
    #arr = nifti.get_fdata(dtype = targetType)
    #get_fdata does not allow integer outputs to try and stop overflow issues from the use of nifti scaling headers. We need to be careful.
    #https://nipy.org/nibabel/devel/biaps/biap_0008.html



    stackAxis = "z" #Stack on z axis.
    axisPos = obtainPosition("z")

    dtype = nifti.header.get_data_dtype()
    vol = Volume(output_path, nifti.shape, dtype=dtype, axis = stackAxis, resolution = resolution, layerType = layerType, label_path = label_path)

    #nibabel is going quite slow with gzip files when reading in part.
    #It looks like massive overhead - probably reading from the start or something weird.
    #Reduce the damage by loading a stack for one full chunk at once.
    sliceCount = nifti.shape[axisPos]

    for i in range(sliceCount):
        sliceArgs = obtainSliceArgs(stackAxis, (i, i+1), len(nifti.shape))
        slice = nifti.slicer[sliceArgs].get_data()
        vol.addSlice(slice)

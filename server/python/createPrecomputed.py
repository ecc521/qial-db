#Takes input file (current NIFTI or TIFF)
#Exports precomputed directory.

from cloudvolume import CloudVolume
from downsampling import downscaleAveraging, majorityAveraging
from thumbnails import generateThumbnailsArray

import numpy as np
import pandas as pd
import shutil
import tifffile
import nibabel
import os
import json

import argparse

parser = argparse.ArgumentParser()
parser.add_argument("input_path")
parser.add_argument("output_path")
parser.add_argument("label_xlsx_path", nargs='?') #Optional. Only used for segmentation labels.
p = parser.parse_args()


#Delete existing directory.
if os.path.exists(p.output_path):
    shutil.rmtree(p.output_path)


#Ensure thumbnails and other files have a directory to export to.
if not os.path.exists(p.output_path):
    os.makedirs(p.output_path)


layerType = "image"
encoding = "raw"
segmentationSubdirName = "segmentation"

resolutionMultiplier = 1
resolution = [1, 1, 1]

fileName = os.path.basename(p.input_path)

if "label" in fileName.lower():
    layerType = "segmentation"
    #compressed_segmentation means lower memory use in neuroglancer, and compressed_segmentation + GZIP is often smaller than GZIP alone.
    #https://github.com/google/neuroglancer/blob/8432f531c4d8eb421556ec36926a29d9064c2d3c/src/neuroglancer/sliceview/compressed_segmentation/README.md
    encoding = 'compressed_segmentation'


if ".nii" in fileName:
    nifti = nibabel.load(p.input_path)
    resolution = nifti.header["pixdim"][1:4] #x, y, and z resolution

    #Units for resolution
    units = nifti.header["xyzt_units"]

    spaceUnits = units % 8
    timeUnits = units - spaceUnits #Not currently used.

    #Resolutions are in nanometers - therefore, we will scale based on units.
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
        #Unknown Resolution. Maintain nanometers.
        pass;
    else:
        raise NotImplementedError


    #Determine type of data
    targetType = nifti.header.get_data_dtype()

    #Neuroglancer doesn't support float64, so use float32 instead.
    if (targetType == np.float64):
        targetType = np.float32


    #Segmentations must be converted to unsigned integers.
    if layerType == "segmentation":
        #TODO: This is not a comprehensive list.
        if (np.issubdtype(targetType, np.signedinteger)):
            size = targetType.itemsize
            #Compressed segmentations must be uint32 or uint64.
            #Raw segmentations may be uint16.
            if (encoding == "compressed_segmentation"):
                size = max(size, 4)
            targetType = "uint" + str(size * 8)

        else:
            targetType = "uint64"


    #Obtain array.
    #arr = nifti.get_fdata(dtype = targetType)
    #get_fdata does not allow integer outputs to try and stop overflow issues from the use of nifti scaling headers. We need to be careful.
    #https://nipy.org/nibabel/devel/biaps/biap_0008.html

    arr = np.asanyarray(nifti.dataobj, dtype = targetType)

elif ".tif" in fileName:
    arr = tifffile.imread(p.input_path)
    targetType = arr.dtype


resolution = [float(round(x*resolutionMultiplier)) for x in resolution] #We'll round these. Nanometers.

#TODO: Reorient.
#Use transpose, rot90, swapaxes, etc.

#Create the precomputed info file (don't save it yet! That happens at the end)
info = CloudVolume.create_new_info(
    num_channels    = arr.shape[3] if arr.shape[3:] else 1,
    layer_type      = layerType,
    data_type       = arr.dtype,
    encoding        = encoding,
    resolution      = resolution, #Voxel scaling, units are in nanometers
    voxel_offset    = [0, 0, 0], #TODO: Does this need to be offset to the voxel center?
    # Pick a convenient size for your underlying chunk representation
    chunk_size      = [64, 64, 64], #Chunk size. Power of 2s are fastest. Balance between size and network request count.
    volume_size     = arr.shape[0:3],
)

#Setup metadata, thumbnails, and other files before we actually generate the precomputed.
if layerType == "image":
    generateThumbnailsArray(arr, *[os.path.join(p.output_path, name + ".webp") for name in ["x", "y", "z"]])

    #TODO: Can norm.json be done with some library?
    #Other option is just to take percentile of smallest scale.
    #The min and max are correct. The viewing range can be off by a bit.
    #TODO: The TIFFs will have different shaders. We should set those too (range same for all shaders though)
    #That way the colors remain even.
    outputObj = {}
    outputObj["min"] = float(arr.min())
    outputObj["max"] = float(arr.max())
    #TODO: Compute lower and upper from a distribution or range or something.

    #Write the results to a file.
    res = open(os.path.join(p.output_path, "norm.json"), "w")
    res.write(json.dumps(outputObj))
    res.close()

elif layerType == "segmentation":
    try:
        # Configure precomputed info file.
        # https://github.com/google/neuroglancer/blob/master/src/neuroglancer/datasource/precomputed/volume.md
        info["@type"] = "neuroglancer_multiscale_volume"
        info["segment_properties"] = segmentationSubdirName

        # Configure auxillary segmentation file.
        #https://github.com/google/neuroglancer/blob/master/src/neuroglancer/datasource/precomputed/segment_properties.md
        segmentationInfo = {"@type": "neuroglancer_segment_properties", "inline": {}}

        df = pd.read_excel(p.label_xlsx_path)
        #Right is the left value plus 1000, IF there are any voxels over 1000 in the image.
        #Otherwise, right is just the actual right value.
        rightOffset = True if (arr.max() > 1000) else False

        idArr = []

        labelArr = []
        descriptionArr = []

        nameProperty = {"id": "label", "type": "label", "values": labelArr}
        descriptionProperty = {"id": "description", "type": "description", "values": descriptionArr}

        propertiesArr = [nameProperty, descriptionProperty]

        for i in range(df.shape[0]):
            name = df["Alex_Abbreviation"][i]
            description = df["Alex_CHASS_Name"][i]
            indexL = df["AlexIndexL"][i]
            indexR = df["AlexIndexR"][i]

            if not pd.isna(name):
                #Neuroglancer requires base 10 string representation for indexes.
                if not pd.isna(indexL):
                    index = str(int(indexL))
                    idArr.append(index)
                    labelArr.append(name + "_L")
                    descriptionArr.append(description + " (Left)")

                if not pd.isna(indexR):
                    if (rightOffset):
                        index = str(int(indexL + 1000))
                    else:
                        index = str(int(indexR))
                    idArr.append(index)
                    labelArr.append(name + "_R")
                    descriptionArr.append(description + " (Right)")


        segmentationInfo["inline"]["ids"] = idArr
        segmentationInfo["inline"]["properties"] = propertiesArr

        segOutputDir = os.path.join(p.output_path, segmentationSubdirName)
        if not os.path.exists(segOutputDir):
            os.makedirs(segOutputDir)

        segOutputFile = open(os.path.join(segOutputDir, "info"), "w")
        segOutputFile.write(json.dumps(segmentationInfo))
        segOutputFile.close()

    except BaseException as e:
        print(e)
        print("Unable to add labels to segmentation. Please confirm a label sheet was passed. ")


vol = CloudVolume("precomputed://file://" + p.output_path, info=info, progress=True) #Progress means show progress bars, etc.
vol[:, :, :, :] = arr #Write the image.

#Write downsampled versions of the image.
downsampleFactor = 2
while all(x%downsampleFactor == 0 for x in vol.shape[0:3]):
    #TODO: We might not have factors of two available, or might not need to downsample all that much, especially for smaller images.

    scale = vol.add_scale([x*downsampleFactor for x in vol.downsample_ratio]) #Add scale to info file.

    vol.mip += 1
    print(vol.downsample_ratio)

    if layerType == "segmentation":
        #Use majority downsampling with segmentations - averaging would result in the labels being for the wrong thing.
        #Don't recurisvely downsample with majority.
        vol[:, :, :, :] = majorityAveraging(arr, *[int(x) for x in vol.downsample_ratio])

    elif layerType == "image":
        arr = downscaleAveraging(arr)
        vol[:, :, :, :] = arr.astype(targetType) #Convert back to correct type.

    else:
        raise NotImplementedError


vol.commit_info() #Save precomputed info file.
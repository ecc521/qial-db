from zipfile import ZipFile
from pydicom import dcmread

import numpy as np
import io

def processDicomZip(zipFilePath):
    zip = ZipFile(zipFilePathd)
    filesInZip = zip.infolist()

    #TODO: Ideally, we would write these iteratively, rather than buffer in memory and write all at once.
    #It's hard to tell exactly how many DICOMs we are going to have though.
    dicomSlices = {}

    for file in filesInZip:
        #TODO: Decompression bombs?
        if file.filename.endswith(".dcm"):
            bytes = zip.read(file)
            bytesStream = io.BytesIO(bytes)
            parsedDicom = dcmread(bytesStream)
            #TODO: Is this rescaled automatically? I believe so, but needs to be checked.
            dicomSlices[parsedDicom.InstanceNumber] = parsedDicom.pixel_array

        else:
            print("Unable to determine file extension for " + file.filename)


    #Ensure keys are ordered property.
    keys = list(dicomSlices.keys())
    for i in range(len(keys)):
        keys[i] = int(keys[i])
    keys.sort()


    sliceStack = []
    for key in keys:
        sliceStack.append(dicomSlices[key])

    #TODO: It looks like numpy is allocating a large array here, rather than using references.
    #We should consider limiting zip reads and dicom processing to only the header, then allocating array,
    #then running through the keys and actually loading the full image data. That would half memory usage.
    arr = np.stack(sliceStack, axis=-1) #-1 means last axis - we want the stack to be z.
    return arr

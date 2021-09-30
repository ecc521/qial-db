#Takes a ZIP file path, reads all DICOMs in the zip, and assembles them into a 3D array.
#Returns 3D array and scan resolution.

#TODO: Handle Image Orientation tag
from zipfile import ZipFile
from pydicom import dcmread

import numpy as np
import io

def processDicomZip(zipFilePath):
    zip = ZipFile(zipFilePath)

    dicomsInZip = []
    for file in zip.infolist():
        if file.filename.endswith(".dcm"):
            dicomsInZip.append(file)
        else:
            print("Unable to determine file extension for " + file.filename)


    #Assume accquisition number starts at 1, and there are no gaps.
    #This assumption allows us to avoid parsing all headers before beginning assembly.

    hasProcessed = False

    for file in dicomsInZip:
        #TODO: Decompression bombs?
        bytes = zip.read(file)
        bytesStream = io.BytesIO(bytes)
        parsedDicom = dcmread(bytesStream)
        #TODO: Is this rescaled automatically based on slope and intercept?

        pixelArr = parsedDicom.pixel_array

        if (hasProcessed == False):
            hasProcessed = True
            #Setup Numpy array.
            arr = np.zeros([*pixelArr.shape, len(dicomsInZip)], dtype=pixelArr.dtype)

            #Set resolutions - values are in millimeters
            #Assume 1000mm if not specified. This should be blatantly enough wrong.
            PixelSpacing = parsedDicom.PixelSpacing or [1000, 1000]
            SliceThickness = parsedDicom.SliceThickness or 1000


        arr[:, :, parsedDicom.InstanceNumber - 1] = pixelArr


    return {"arr": arr, "resolution": [*PixelSpacing, SliceThickness]}

#Takes a ZIP file path, reads all DICOMs in the zip, and creates a precomputed at the output path.

#TODO: Handle Image Orientation tag
from zipfile import ZipFile
from pydicom import dcmread

import numpy as np
import io

from Classes.Volume import Volume


def zipToPrecomputed(zipFilePath, output_path, label_path):
    zip = ZipFile(zipFilePath)

    dicomsInZip = []
    for file in zip.infolist():
        if file.filename.endswith(".dcm"):
            dicomsInZip.append(file)
        else:
            print("Unable to determine file extension for " + file.filename)


    #Assume accquisition number starts at 1, and there are no gaps.
    #This assumption allows us to avoid parsing all headers before beginning assembly.

    vol = None

    for file in dicomsInZip:
        #TODO: Decompression bombs?
        bytes = zip.read(file)
        bytesStream = io.BytesIO(bytes)
        parsedDicom = dcmread(bytesStream)
        #TODO: Is this rescaled automatically based on slope and intercept?

        pixelArr = parsedDicom.pixel_array

        if (vol is None):
            #Set resolutions - values are in millimeters
            #Assume 1000mm if not specified. This should be blatantly enough wrong.
            PixelSpacing = parsedDicom.PixelSpacing or [1000, 1000]
            SliceThickness = parsedDicom.SliceThickness or 1000

            resolution = [*PixelSpacing, SliceThickness]
            shape = [*pixelArr.shape, len(dicomsInZip)] #Stack on z axis.

            vol = Volume(output_path, shape=shape, resolution=resolution, dtype=pixelArr.dtype, axis = "z", label_path = label_path)

        vol.addSlice(pixelArr)

    return vol

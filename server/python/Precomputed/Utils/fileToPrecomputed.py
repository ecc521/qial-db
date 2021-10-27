import os
import shutil

from Formats.Nifti import niftiToPrecomputed
from Formats.Dicom import zipToPrecomputed
from Formats.Tiff import tiffToPrecomputed


def fileToPrecomputed(input_path, output_path, label_path):
    #Distribute requests between the formats.

    #TODO: We need to take a look at the orientation of each incoming image. 
    if (os.path.exists(output_path)):
        print("Deleting existing directory at output location. ")
        shutil.rmtree(output_path)

    fileName = os.path.basename(input_path)

    if ".zip" in fileName:
        zipToPrecomputed(input_path, output_path, label_path)

    elif ".tif" in fileName:
        tiffToPrecomputed(input_path, output_path, label_path)

    elif ".nii" in fileName:
        niftiToPrecomputed(input_path, output_path, label_path)

    else:
        raise NotImplementedError("Could not determine image format from file name: " + fileName)

import os

from Formats.Nifti import niftiToPrecomputed
from Formats.Dicom import zipToPrecomputed
from Formats.Tiff import tiffToPrecomputed


def fileToPrecomputed(input_path, output_path):
    #Distribute requests between the formats.

    fileName = os.path.basename(input_path)

    if ".zip" in fileName:
        zipToPrecomputed(input_path, output_path)

    elif ".tif" in fileName:
        tiffToPrecomputed(input_path, output_path)

    elif ".nii" in fileName:
        niftiToPrecomputed(input_path, output_path)

    else:
        raise NotImplementedError

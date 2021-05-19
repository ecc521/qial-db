#Currently, generateThumbnails.py requires the entire decompressed file to generate thumbnails.
#This works fine with raw .nii files, but gzipped versions are fully decompressed in memory,
#which can cause OOM errors.

#TODO: It is possible to generate the output images with a stream at O(n) time complexity, thereby eliminating the memory requirement.
#That should be done if possible. Note that GZIP may complicate the issue.
import nibabel as nib
import numpy as np
import argparse
from pathlib import Path
import imageio

parser = argparse.ArgumentParser()
parser.add_argument("file_path", type=Path)
parser.add_argument("x_out_path", type=Path)
parser.add_argument("y_out_path", type=Path)
parser.add_argument("z_out_path", type=Path)

p = parser.parse_args()

data = nib.load(p.file_path)
data.get_fdata()
data = data.get_fdata()

if(len(data.shape) == 4):
    slice_x = data[int(data.shape[0]/2), :, :, int(data.shape[3]/2)]
    slice_y = data[:, int(data.shape[1]/2), :, int(data.shape[3]/2)]
    slice_z = data[:, :, int(data.shape[2]/2), int(data.shape[3]/2)]
elif(len(data.shape) == 3):
    slice_x = data[int(data.shape[0]/2), :, :]
    slice_y = data[:, int(data.shape[1]/2), :]
    slice_z = data[:, :, int(data.shape[2]/2)]


def writeImage(outPath, slice):
    imageio.imwrite(outPath, slice)

writeImage(p.x_out_path, slice_x)
writeImage(p.y_out_path, slice_y)
writeImage(p.z_out_path, slice_z)

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

imageio.imwrite(p.x_out_path, slice_x)
imageio.imwrite(p.y_out_path, slice_y)
imageio.imwrite(p.z_out_path, slice_z)

#TODO: Consider using a lossy format instead of PNG. The difference is very minor for 2x+ savings, and these are thumbnails. 

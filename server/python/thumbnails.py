#Creates thumbnails from precomputed volume or numpy array. (Command line is path to precomputed volume)
#TODO: These thumbnails are aligned differently than neuroglancer.

from cloudvolume import CloudVolume
import PIL
import imageio
import io

import numpy as np

import argparse

urlPrefix = "precomputed://file://"

#Takes a volume slice and writes the output file.
def writeImage(outPath, slice):
    bytes = imageio.imwrite(imageio.RETURN_BYTES, slice, format="GIF") #Any format works - temporary in memory storage.
    inputBytes = io.BytesIO(bytes)

    image = PIL.Image.open(inputBytes)
    #Resize - Max width 500, max height 180.
    image.thumbnail([500, 180])
    image.save(outPath, method=6, quality=60) #Method 6 is webp best compression, quality is 1-100, default 80


def generateThumbnailsSlices(sliceX, sliceY, sliceZ, x_out, y_out, z_out):
    #Draw slices to disk.
    #Make sure that images don't end up pure black if the highest slice value is something like 5000 and the max value is 65535.

    multiplier = 1.0

    #dtype is the same for all slices. Just use sliceX.
    if (np.issubdtype(sliceX.dtype, np.integer)):
        #TODO: Better normalization. Linear scaling probably isn't ideal.
        #TODO: This code assumes that any integers don't have values more deeply negative than they do positive.
        max_value = np.iinfo(sliceX.dtype).max
        overallMax = max(sliceX.max(), sliceY.max(), sliceZ.max())

        multiplier = int(max_value / overallMax) #Keep it simple. If the difference is only 1.9x, it should be visible either way.

    #Actually output the slices.
    writeImage(x_out, sliceX * multiplier)
    writeImage(y_out, sliceY * multiplier)
    writeImage(z_out, sliceZ * multiplier)

def generateThumbnailsArray(arr, *outputs):
    sliceX = arr[int(arr.shape[0]/2)]
    sliceY = arr[:, int(arr.shape[1]/2)]
    sliceZ = arr[:, :, int(arr.shape[2]/2)]

    generateThumbnailsSlices(sliceX, sliceY, sliceZ, *outputs)



def generateThumbnailsVolume(volume, *outputs):
    sliceX = volume[volume.shape[0]/2]
    sliceY = volume[:, volume.shape[1]/2]
    sliceZ = volume[:, :, volume.shape[2]/2]

    generateThumbnailsSlices(sliceX[0], sliceY[:, 0], sliceZ[:, :, 0], *outputs)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path")
    parser.add_argument("x_out")
    parser.add_argument("y_out")
    parser.add_argument("z_out")

    p = parser.parse_args()
    volume = CloudVolume(urlPrefix + str(p.input_path))
    generateThumbnailsVolume(volume, p.x_out, p.y_out, p.z_out)

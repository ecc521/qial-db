#Creates thumbnails from precomputed volume or numpy array. (Command line is path to precomputed volume)
#TODO: These thumbnails are aligned differently than neuroglancer. 
from cloudvolume import CloudVolume
import PIL
import imageio
import io

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


def generateThumbnailsArray(arr, x_out, y_out, z_out):
    sliceX = arr[int(arr.shape[0]/2)]
    writeImage(x_out, sliceX)

    sliceY = arr[:, int(arr.shape[1]/2)]
    writeImage(y_out, sliceY)

    sliceZ = arr[:, :, int(arr.shape[2]/2)]
    writeImage(z_out, sliceZ)


def generateThumbnailsVolume(volume, x_out, y_out, z_out):
    sliceX = volume[volume.shape[0]/2]
    writeImage(x_out, sliceX[0])

    sliceY = volume[:, volume.shape[1]/2]
    writeImage(y_out, sliceY[:, 0])

    sliceZ = volume[:, :, volume.shape[2]/2]
    writeImage(z_out, sliceZ[:, :, 0])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path")
    parser.add_argument("x_out")
    parser.add_argument("y_out")
    parser.add_argument("z_out")

    p = parser.parse_args()
    volume = CloudVolume(urlPrefix + str(p.input_path))
    generateThumbnailsVolume(volume, p.x_out, p.y_out, p.z_out)

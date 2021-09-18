#Creates thumbnails from precomputed volume.

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


def generateThumbnails(input_path, x_out, y_out, z_out):
    volume = CloudVolume(urlPrefix + str(input_path))

    #Find the highest resolution scale.
    greatestScale = [0, 0, 0]
    for scale in volume.info["scales"]:
        size = scale["size"]
        if (greatestScale[0] < size[0]):
            greatestScale = size


    channelNum = int(volume.info["num_channels"]/2) #Determine the channel to use. TODO: RGB?

    sliceX = volume[int(greatestScale[0] / 2), :, :, channelNum].tolist()
    sliceY = volume[:, int(greatestScale[1] / 2), :, channelNum].tolist()
    sliceZ = volume[:, :, int(greatestScale[2] / 2), channelNum].tolist()


    #One of the dimensions is composed of one element arrays. We need to extract those.
    sliceX = sliceX[0]

    for index in range(len(sliceY)):
        sliceY[index] = sliceY[index][0]

    for arr in sliceZ:
        for index in range(len(arr)):
            arr[index] = arr[index][0]

    writeImage(x_out, sliceX)
    writeImage(y_out, sliceY)
    writeImage(z_out, sliceZ)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path")
    parser.add_argument("x_out")
    parser.add_argument("y_out")
    parser.add_argument("z_out")

    p = parser.parse_args()
    generateThumbnails(p.input_path, p.x_out, p.y_out, p.z_out)

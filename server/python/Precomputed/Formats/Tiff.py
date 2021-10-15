from Classes.Volume import Volume
from Utils.axes import obtainPosition
from Utils.axes import obtainPosition, obtainSliceArgs, shapeNumAxes

import tifffile

#TODO: Slice, instead of buffering all in memory.
def tiffToPrecomputed(tiffPath, output_path, label_path):
    arr = tifffile.imread(tiffPath)

    if ((len(arr.shape) == 4) & (arr.shape[3] == 3)):
        #TODO: We need a better system for determining what images are color.
        colorSpace = "rgb"

    #tifffile reads with z axis first. Let's reorient the tiffs to match the other files.
    transposeArgs = [2,1,0]
    if (len(arr.shape) == 4): transposeArgs.append(3)
    arr = arr.transpose(*transposeArgs)


    stackAxis = "z" #Stack on z axis.
    axisPos = obtainPosition("z")

    vol = Volume(output_path, arr.shape, dtype=arr.dtype, axis = stackAxis, label_path = label_path, colorSpace = colorSpace)
    vol.addChunk(arr)

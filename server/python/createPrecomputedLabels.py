import nibabel as nib
import pandas as pd
import os
import sys
import shutil
from neuroglancer_scripts.scripts.volume_to_precomputed_pyramid import volume_to_precomputed_pyramid
from neuroglancer_scripts.scripts.volume_to_precomputed import main as volume_to_precomputed
from neuroglancer_scripts.scripts.generate_scales_info import main as generate_scales_info
from neuroglancer_scripts.scripts.compute_scales import main as compute_scales
from restructurePrecomputed import restructurePrecomputedDirectory

import gzip

dirnam = os.getcwd()

def main():
    image = nib.load(os.path.normpath(os.path.join(dirnam, sys.argv[1])))
    image = image.get_fdata()
    df = pd.read_excel(os.path.normpath(os.path.join(dirnam, sys.argv[2])))

    #Optional 3rd parameter for output directory name.
    outputDirName = "Output"
    outputDir = os.path.join(dirnam, outputDirName)

    if len(sys.argv) > 3:
        outputDirName = sys.argv[3]
        outputDir = os.path.join(dirnam, outputDirName)
        if (os.path.exists(outputDir)):
            print("WARNING: DELETING EXISTING DIRECTORY AT TARGET LOCATION")
            shutil.rmtree(outputDir)

    using1000Method = False
    for x in range(0, len(image)):
        for y in range(0, len(image[0])):
            for z in range(0, len(image[0, 0])):
                if image[x, y, z] > 1000:
                    using1000Method = True

    maxLabelFound = False
    i = -1
    while not maxLabelFound:
        maxLabel = df['AlexIndexL'].iat[i]
        maxLabelFound = maxLabel.is_integer()
        i -= 1

    maxLabel = int(maxLabel)

    infoFilePath = os.path.normpath(os.path.join(dirnam, "info"))
    info = open(infoFilePath, "w")
    info.write("{\"@type\": \"neuroglancer_segment_properties\", \"inline\": {\"ids\": [\"")
    for x in range(1, maxLabel + 1):
        info.write(str(x))
        info.write("\", \"")

    if using1000Method:
        for x in range(1, maxLabel):
            info.write(str(x + 1000))
            info.write("\", \"")
        info.write(str(x + 1001))
    else:
        for x in range(1, maxLabel):
            info.write(str(x + maxLabel))
            info.write("\", \"")
        info.write(str(x + maxLabel + 1))

    info.write("\"], \"properties\": [{\"id\": \"label\", \"type\": \"label\", \"values\": [\"")
    for x in range(0, maxLabel):
        info.write(df['Alex_Abbreviation'].iat[x] + "_L")
        info.write("\", \"")
    for x in range(0, maxLabel - 1):
        info.write(df['Alex_Abbreviation'].iat[x] + "_R")
        info.write("\", \"")
    info.write(df['Alex_Abbreviation'].iat[x + 1] + "_R")
    info.write("\"]}]}}")

    volume_to_precomputed(argv=["Placeholder", os.path.normpath(os.path.join(dirnam, sys.argv[1])), "--generate-info", outputDirName])

    fin = open(os.path.join(os.getcwd(), outputDirName + "/info_fullres.json"), "rt")
    data = fin.read()
    data = data.replace("float32", "uint32")
    fin.close()
    fout = open(os.path.join(os.getcwd(), outputDirName + "/info_fullres.json"), "wt")
    fout.write(data)
    fout.close()

    generate_scales_info(argv=["Placeholder", outputDirName + "/info_fullres.json", outputDirName, "--type=segmentation"])
    volume_to_precomputed(argv=["Placeholder", os.path.normpath(os.path.join(dirnam, sys.argv[1])), outputDirName])
    compute_scales(argv=["Placeholder", outputDirName, "--downscaling-method=majority"])

    os.remove(infoFilePath) #Clean up.
    restructurePrecomputedDirectory(outputDir)

if __name__ == "__main__":
    main()

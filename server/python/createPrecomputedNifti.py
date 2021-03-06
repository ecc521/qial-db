import shutil
import os
import sys

from neuroglancer_scripts.scripts.volume_to_precomputed import main as volume_to_precomputed
from neuroglancer_scripts.scripts.generate_scales_info import main as generate_scales_info
from neuroglancer_scripts.scripts.compute_scales import main as compute_scales
from restructurePrecomputed import restructurePrecomputedDirectory
from normalizePrecomputed import normalizeDir

niftiPath = sys.argv[1]
outputDirName = sys.argv[2]
outputDir = os.path.join(os.getcwd(), outputDirName)

if (os.path.exists(outputDir)):
    print("WARNING: DELETING EXISTING DIRECTORY AT TARGET LOCATION")
    shutil.rmtree(outputDir)


volume_to_precomputed(argv=["Placeholder", "--generate-info", niftiPath, outputDir])
generate_scales_info(argv=["Placeholder", os.path.join(outputDir, "info_fullres.json"), outputDir])
volume_to_precomputed(argv=["Placeholder", niftiPath, outputDir])
compute_scales(argv=["Placeholder", outputDir])

restructurePrecomputedDirectory(outputDir)
normalizeDir(outputDir) #Currently float32 only, however that isn't checked, so may cause problems on other files. 

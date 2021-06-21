import os
import shutil

#We need to flatten the directory path - "0-64/0-64" goes to "0-64_0-64"
def restructureDirectory(currentDir):
    directoriesToDelete = []
    for root, dirs, files in os.walk(currentDir):

        for name in files:
            if (name.endswith(".gz")):
                path = os.path.join(root, name)
                relativePath = path[len(currentDir) + 1:]
                components = relativePath.split(os.sep)
                reformatedName = "_".join(components)
                reformattedPath = os.path.join(currentDir, reformatedName)

                os.rename(path, reformattedPath)

        #Delete the now empty directories.
        for directory in dirs:
            directoriesToDelete.append(os.path.join(root, directory))


    for item in directoriesToDelete:
        try:
            shutil.rmtree(item)
        except:
            1 #No-op. If the directory doesn't get deleted, it might be because parent was deleted first, and doesn't really matter.


def restructurePrecomputedDirectory(outputDir):
    items = os.listdir(outputDir)
    for item in items:
        if (item.endswith("um")):
            restructureDirectory(os.path.join(outputDir, item))

import pandas as pd

def segmentVolume(vol, label_path, segmentationSubdirName = "segmentation"):
    #Never throws, though may log errors.
    #Configures volume for segmentation data.
    #Attempts to add labels and descriptions from label_path. 
    try:
        info = vol.info

        # Configure precomputed info file.
        # https://github.com/google/neuroglancer/blob/master/src/neuroglancer/datasource/precomputed/volume.md
        info["@type"] = "neuroglancer_multiscale_volume"
        info["segment_properties"] = segmentationSubdirName

        # Configure auxillary segmentation file.
        #https://github.com/google/neuroglancer/blob/master/src/neuroglancer/datasource/precomputed/segment_properties.md
        segmentationInfo = {"@type": "neuroglancer_segment_properties", "inline": {}}

        #There's some features of excel (calculations with rows, etc) that aren't supported by the reader.
        #This might result in warnings about unknown extensions.
        df = pd.read_excel(label_path)

        #Right is the left value plus 1000, IF there are any voxels over 1000 in the image.
        #Otherwise, right is just the actual right value.
        rightOffset = True if (arr.max() > 1000) else False

        idArr = []

        labelArr = []
        descriptionArr = []

        nameProperty = {"id": "label", "type": "label", "values": labelArr}
        descriptionProperty = {"id": "description", "type": "description", "values": descriptionArr}

        propertiesArr = [nameProperty, descriptionProperty]

        for i in range(df.shape[0]):
            name = df["Alex_Abbreviation"][i]
            description = df["Alex_CHASS_Name"][i]
            indexL = df["AlexIndexL"][i]
            indexR = df["AlexIndexR"][i]

            if not pd.isna(name):
                #Neuroglancer requires base 10 string representation for indexes.
                if not pd.isna(indexL):
                    index = str(int(indexL))
                    idArr.append(index)
                    labelArr.append(name + "_L")
                    descriptionArr.append(description + " (Left)")

                if not pd.isna(indexR):
                    if (rightOffset):
                        index = str(int(indexL + 1000))
                    else:
                        index = str(int(indexR))
                    idArr.append(index)
                    labelArr.append(name + "_R")
                    descriptionArr.append(description + " (Right)")


        segmentationInfo["inline"]["ids"] = idArr
        segmentationInfo["inline"]["properties"] = propertiesArr

        segOutputDir = os.path.join(p.output_path, segmentationSubdirName)
        if not os.path.exists(segOutputDir):
            os.makedirs(segOutputDir)

        segOutputFile = open(os.path.join(segOutputDir, "info"), "w")
        segOutputFile.write(json.dumps(segmentationInfo))
        segOutputFile.close()

    except BaseException as e:
        print(e)
        print("Unable to add labels to segmentation. Please confirm a label sheet was passed. ")

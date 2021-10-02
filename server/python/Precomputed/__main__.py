import argparse
from Utils.fileToPrecomputed import fileToPrecomputed

parser = argparse.ArgumentParser()
parser.add_argument("input_path")
parser.add_argument("output_path")
parser.add_argument("label_path", default = None)

p = parser.parse_args()
fileToPrecomputed(p.input_path, p.output_path, label_path = p.label_path)

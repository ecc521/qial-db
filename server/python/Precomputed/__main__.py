import argparse
from Utils.fileToPrecomputed import fileToPrecomputed

parser = argparse.ArgumentParser()
parser.add_argument("input_path")
parser.add_argument("output_path")

p = parser.parse_args()
fileToPrecomputed(p.input_path, p.output_path)

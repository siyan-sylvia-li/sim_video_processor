import json

from file_processor import FileProcessor
from argparse import ArgumentParser

if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("--config_file", type=str)
    args = parser.parse_args()
    config_file = json.load(open(args.config_file))

    fp = FileProcessor(**config_file)
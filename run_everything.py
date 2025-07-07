import json

from file_processor import FileProcessor
from evaluator import Evaluator
from argparse import ArgumentParser
import os

if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("--config_file", type=str)
    parser.add_argument("--evaluate", action="store_true")
    args = parser.parse_args()
    config_file = json.load(open(args.config_file))

    fp = FileProcessor(**config_file)
    if not os.path.exists(os.path.join(fp.intermediate_dir, "speaker_info.json")):
        fp.process()

    # Compare speaker speaking duration

    # Assume speaker label file exists

    if args.evaluate:
        gt_segments_path = os.path.join("ground_truth_labels/", "speaker_gt_segments.json")
        if not os.path.exists(gt_segments_path):
            raise FileNotFoundError(f"{gt_segments_path} does not exist")
        
        gt_speaker_segs = json.load(open(gt_segments_path))
        
        
        # Assuming we have a set of segments and corresponding speaker labels
        eval = Evaluator(gt_speaker_segs, fp.all_segment_info, fp.trans_text)
        eval_results = eval.evaluate()
        print(eval_results)
        json.dump(eval_results, open("evaluation_results.json", "w+"))

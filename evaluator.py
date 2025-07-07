from pyannote.core import Segment, Timeline, Annotation
from pyannote.metrics.diarization import DiarizationErrorRate
from jiwer import wer
import os
import json

class Evaluator:
    def __init__(self, ground_truth_dict,
                 segment_info_dict,
                 pred_trans_text: str):
        self.ground_truth_dict = ground_truth_dict
        self.segment_info_dict = segment_info_dict
        self.pred_trans_text = pred_trans_text

    def compute_diarization(self):
        reference = Annotation()
        for s in self.ground_truth_dict["segments"]:
            seg = self.ground_truth_dict["segments"][s]
            reference[Segment(seg["start"],
                              seg["end"])] = seg["speaker"]
        hypothesis = Annotation()
        for s in self.segment_info_dict:
            seg = self.segment_info_dict[s]
            if len(seg["speaker_preds"]):
                hypothesis[Segment(seg["start"],
                                seg["end"])] = seg["speaker_preds"][0][0]
        metric = DiarizationErrorRate()
        return metric(reference, hypothesis)
    
    def compute_wer(self):
        return wer(self.ground_truth_dict["text"],
                   self.pred_trans_text)

    def evaluate(self):
        results = {}
        if "segments" in self.ground_truth_path:
            results["diarization"] = self.compute_diarization()
        if "text" in self.ground_truth_dict:
            results["wer"] = self.compute_wer()
        return results
        
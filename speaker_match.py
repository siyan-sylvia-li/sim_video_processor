from thefuzz import fuzz

def match_speaker_to_segments(segments, speaker_utt):
    best_match, best_ratio = None, float("-inf")
    for s in segments:
        partial_ratio = fuzz.partial_ratio(s["text"], speaker_utt)
        if partial_ratio > best_ratio:
            best_ratio = partial_ratio
            best_match = s["id"]
    return best_match
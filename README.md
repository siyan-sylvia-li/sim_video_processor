# A Speaker Diarization Framework for Using Medical Simulations in NLP
Honestly, this diarization framework can be used for any type of multi-speaker videos! We just pooled together some existing packages to make life easier!

## Setup

```bash
pip install -r requirements.txt
```


## Pre-processing
1. You would obviously have the video file of the simulation.
2. Identify a set of speakers that you are interested in, and then manually identify utterances that they have said that are unique to them (i.e. they are the only person that said that the entire video), and record this in a `speaker_dict.json` file. This should look like this:
```json
{
    "Airway Nurse": [
        "Nope, still easy to manage",
    ]
}
```

Note that you can include multiple utterances here; more utterances and longer utterances should be able to help you identify speakers more accurately.

## Using the Diarization Framework

You would need to specify a json configuration file with the following dictionary keys:

1. `file_path`: string, the path to your video file
2. `segment_dir`: string, a directory to store individual video segments that correspond to speech utterances, extracted using OpenAI's Whisper
3. `intermediate_dir`: string, a directory to store intermediate results from the processing
4. `speaker_dict_path`: string, the path to your `speaker_dict.json` file
5. `denoise`: boolean, whether to apply denoising, defaults to `False`
6. `denoise_prop`: float, proportion of noise to remove, defaults to 0.1; note that if your audio quality is not sufficiently high, setting this number to be too high may negatively affect your audio
7. `verification_threshold`: float, the similarity score threshold between speaker embeddings and segment speech embeddings; the higher the similarity score, the more confident we are that a specific speech segment is uttered by this specific speaker; defaults to 0.25
8. `write_video`: boolean, whether to produce a video that concatenates all the utterances by the same speaker together for each of the speakers; defaults to True

### Running Diarization Framework
```bash
python run_everything.py --config_file <PATH_TO_YOUR_CONFIG_JSON>
```

### Where to find intermediate outputs

All of these files and folders will be located under `intermediate_dir/`.

1. `speaker_info.json`: A speaker-centric view of the extracted data. What specific segments and sentences did a speaker speak? You can cross-reference the segment ids found in `pred_segments` with the segments in `<intermediate_dir>/whisper_results.json`.
2. `segment_info.json`: A segment-centric view of the extracted data. What are our confidence scores for each of the speakers for this specific segment?
3. `transcript.txt`: The full transcript of the video, according to Whisper.
4. `final_merged_speakers/*.mp4`: Each of these videos will represent a speaker of interest. The video corresponding to a specific speaker would include all speech segments that we predict to have been said by this speaker.

## Evaluating the Diarization Framework

To perform the evaluation, we would first need some ground truth labeling indicating which speakers are speaking when. 

### Ground Truth JSON File Requirements

This file should have the following structure:

- The file must be a list of dictionaries, each representing a speech segment.
- Each dictionary should contain:
    - `"speaker"`: The speaker label (string).
    - `"start"`: Start time of the segment in seconds (float or int).
    - `"end"`: End time of the segment in seconds (float or int).

**Example:**
```json
[
    {"speaker": "Doctor", "start": 0.0, "end": 5.2},
    {"speaker": "Patient", "start": 5.2, "end": 10.7},
    {"speaker": "Nurse", "start": 10.7, "end": 15.0}
]
```

### Running Evaluation

```bash
python run_everything.py --config_file <SAME_CONFIG_FILE_AS_ABOVE> --evaluate
```
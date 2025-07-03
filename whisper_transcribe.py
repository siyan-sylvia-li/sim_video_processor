import whisper
import torchaudio 
import os
from moviepy import VideoFileClip
import tqdm

def transcribe_with_whisper(file_path: str, segment_dir: str):
    signal, fs = torchaudio.load(file_path)
    
    model = whisper.load_model("turbo")
    result = model.transcribe(file_path, word_timestamps=True)
    for i, segment in tqdm.tqdm(enumerate(result["segments"])):
        start, end = int(segment['start'] * fs), int(segment['end'] * fs)
        segment_signal = signal[:, start: end]
        segment_path = f"{segment_dir}/segment_{i}.wav"
        torchaudio.save(segment_path, segment_signal, fs)
    return result
        
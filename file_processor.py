import os
from moviepy import VideoFileClip, AudioFileClip
from end_to_end.whisper_transcribe import transcribe_with_whisper
from typing import List
import json
from end_to_end.speaker_match import match_speaker_to_segments
from moviepy import concatenate_audioclips, AudioFileClip, concatenate_videoclips
import torchaudio
import torch
from noisereduce.torchgate import TorchGate as TG
import tqdm
import glob

from speechbrain.inference.speaker import SpeakerRecognition

class FileProcessor:
    def __init__(self, file_path: str, segment_dir: str, intermediate_dir: str, 
                 speaker_dict: dict[str, List[str]], denoise: bool = False, denoise_prop: float = 0.1,
                 verification_threshold: float = 0.25):
        if not os.path.exists(file_path):
            raise FileNotFoundError
        if not os.path.exists(segment_dir):
            os.makedirs(segment_dir)
        if not os.path.exists(intermediate_dir):
            os.makedirs(intermediate_dir)
            os.makedirs(os.path.join(intermediate_dir + "/", "speakers/"))
            os.makedirs(os.path.join(intermediate_dir + "/", "final_merged_speakers/"))
        device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
        self.video_file_path = file_path
        assert not self.file_path.endswith(".wav")
        if not file_path.endswith(".wav"):
            # Need to write the audio file
            file_path_wav = os.path.splitext(file_path)[0] + ".wav"
            if not os.path.exists(file_path_wav):
                clip = VideoFileClip(file_path)
                clip.audio.write_audiofile(file_path_wav)
            self.file_path = file_path_wav
        if denoise:
            noisy_speech, sr = torchaudio.load(self.file_path)
            noisy_speech = noisy_speech.to(device)
            # Create TorchGating instance
            tg = TG(sr=sr, nonstationary=True, prop_decrease=denoise_prop).to(device)
            # Apply Spectral Gate to noisy speech signal
            enhanced_speech = tg(noisy_speech)
            dn_file_path_wav = os.path.splitext(file_path)[0] + "_denoised.wav"
            torchaudio.save(dn_file_path_wav, src=enhanced_speech.cpu(), sample_rate=sr)
            self.file_path = dn_file_path_wav
        self.segment_dir = segment_dir
        self.intermediate_dir = intermediate_dir
        self.all_speaker_info = {}
        for s in speaker_dict:
            self.all_speaker_info.update({
                s: {
                    "ref_utterances": speaker_dict[s],
                    "ref_segments": [],
                    "pred_utterances": [],
                    "pred_segments": []
                }
            })
        self.verification = SpeakerRecognition.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb", savedir=f"{self.intermediate_dir}/pretrained_models/spkrec-ecapa-voxceleb", run_opts={"device":"cuda"})
        self.verification_threshold = verification_threshold
    
    def process(self):
        # Saving individual segments
        results = transcribe_with_whisper(self.file_path, self.segment_dir)
        json.dump(results, open(os.path.join(self.intermediate_dir, "whisper_results.json"), "w+"))
        # Go identify speaker segments using fuzzy string match
        for speaker in self.all_speaker_info:
            for utt in self.all_speaker_info[speaker]["ref_utterances"]:
                utt_id = match_speaker_to_segments(results["segments"], utt)
                utt_seg_path = os.path.join(self.segment_dir, f"segment_{utt_id}.wav")
                self.all_speaker_info[speaker]["ref_segments"].append(utt_seg_path)
        # Merge all the reference segments into one major segment
        for speaker in self.all_speaker_info:
            audio_clips = []
            for seg_path in self.all_speaker_info[speaker]["ref_segments"]:
                if os.path.exists(seg_path):
                    audio_clips.append(AudioFileClip(seg_path))
            if len(audio_clips):
                merged_clip: AudioFileClip = concatenate_audioclips(audio_clips)
                merged_path = os.path.join(self.intermediate_dir + "/", "speakers/", f"{speaker}.wav")
                merged_clip.write_audiofile(merged_path)
                merged_clip.close()
            for clip in audio_clips:
                clip.close()
        # Iterate through each speaker and each segment
        for seg in tqdm.tqdm(results["segments"]):
            seg_path = f"{self.segment_dir}/segment_{seg["id"]}.wav"
            seg_text = seg["text"]
            best_speaker, best_score = None, float("-inf")
            try:
                for speaker in self.all_speaker_info:
                    # Verify the segment and try to find the best one
                    speaker_path = os.path.join(self.intermediate_dir, "speakers/", f"{speaker}.wav")
                    score, _ = self.verification.verify_files(seg_path, speaker_path)
                    if score > best_score:
                        best_score = score
                        best_speaker = speaker
                if best_score > self.verification_threshold:
                    self.all_speaker_info[best_speaker]["pred_segments"].append((seg["id"], seg["start"], seg["end"]))
                    self.all_speaker_info[best_speaker]["pred_utterances"].append(seg_text)
            except RuntimeError:
                continue
        
        json.dump(self.all_speaker_info, open(os.path.join(self.intermediate_dir, "speaker_info.json"), "w+"))
        
        # Merge clips that we think are spoken by the same speaker
        og_video_clip = VideoFileClip(self.video_file_path)
        for speaker in tqdm.tqdm(self.all_speaker_info):
            all_speaker_clips = []
            for _, s, e in self.all_speaker_info[speaker]["pred_segments"]:
                all_speaker_clips.append(og_video_clip.subclipped(s, e))
            fin_speaker_clip = concatenate_videoclips(all_speaker_clips)
            fin_speaker_clip.write_videofile(os.path.join(self.intermediate_dir, "final_merged_speakers/", f"{speaker}.mp4"))
        
        print("Finished Processing File!! <3")
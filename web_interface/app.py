from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for, send_file
import os
import json
import uuid
from datetime import datetime
import cv2
from pathlib import Path

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = 'uploads'

# Ensure upload directory exists for saving labels
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Global variables to store current session data
current_video = None
current_segments = []
current_speakers = []

def load_speaker_config():
    """Load speaker configuration from config file"""
    config_path = Path('data/speaker_dict.json')
    if config_path.exists():
        with open(config_path, 'r') as f:
            speaker_data = json.load(f)
            # return list(speaker_data.keys())
            return speaker_data
    else:
        # Default speakers if no config file exists
        # return ["Speaker 1", "Speaker 2", "Speaker 3"]
        return []

def get_video_info(video_path):
    """Extract basic video information"""
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        
        return {
            'fps': fps,
            'frame_count': frame_count,
            'duration': duration,
            'width': width,
            'height': height
        }
    except Exception as e:
        print(f"Error getting video info: {e}")
        return None

@app.route('/')
def index():
    """Main page with video path input and labeling interface"""
    global current_speakers
    current_speakers = load_speaker_config()
    return render_template('index.html', speakers=current_speakers)

@app.route('/load_video', methods=['POST'])
def load_video():
    """Handle loading a video from local file path"""
    global current_video, current_segments
    
    data = request.get_json()
    video_path = data.get('video_path', '').strip()
    
    if not video_path:
        return jsonify({'error': 'No video path provided'}), 400
    
    # Check if file exists
    if not os.path.exists(video_path):
        return jsonify({'error': 'Video file not found'}), 400
    
    # Check if it's a valid video file
    video_info = get_video_info(video_path)
    if not video_info:
        return jsonify({'error': 'Could not read video file or invalid format'}), 400
    
    # Store video information
    current_video = {
        'filepath': video_path,
        'filename': os.path.basename(video_path),
        'info': video_info
    }
    current_segments = []  # Clear segments when loading new video
    
    return jsonify({
        'success': True,
        'filename': current_video['filename'],
        'filepath': video_path,
        'video_url': f'/serve_video/{os.path.basename(video_path)}',
        'duration': video_info['duration'],
        'fps': video_info['fps'],
        'width': video_info['width'],
        'height': video_info['height']
    })

@app.route('/load_segments', methods=['POST'])
def load_segments():
    """Load segments from a JSON file similar to whisper_results.json"""
    global current_segments
    
    if not current_video:
        return jsonify({'error': 'No video loaded. Please load a video first.'}), 400
    
    data = request.get_json()
    segments_file_path = data.get('segments_file_path', '').strip()
    
    if not segments_file_path:
        return jsonify({'error': 'No segments file path provided'}), 400
    
    # Check if file exists
    if not os.path.exists(segments_file_path):
        return jsonify({'error': 'Segments file not found'}), 400
    
    try:
        with open(segments_file_path, 'r', encoding='utf-8') as f:
            segments_data = json.load(f)
        
        # Extract segments from the JSON structure
        if 'segments' in segments_data and isinstance(segments_data['segments'], list):
            segments = segments_data['segments']
        else:
            # If the file is just a list of segments
            segments = segments_data if isinstance(segments_data, list) else []
        
        # Convert segments to our internal format
        converted_segments = []
        for i, segment in enumerate(segments):
            if isinstance(segment, dict) and 'start' in segment and 'end' in segment:
                converted_segment = {
                    'id': str(uuid.uuid4()),
                    'start_time': float(segment['start']),
                    'end_time': float(segment['end']),
                    'text': segment.get('text', ''),
                    'original_text': segment.get('text', ''),  # Store original text for comparison
                    'speaker': '',  # Will be filled by user
                    'notes': f"Loaded from {os.path.basename(segments_file_path)}"
                }
                converted_segments.append(converted_segment)
        
        if not converted_segments:
            return jsonify({'error': 'No valid segments found in the file'}), 400
        
        # Replace current segments with loaded ones
        current_segments = converted_segments
        
        return jsonify({
            'success': True,
            'message': f'Successfully loaded {len(converted_segments)} segments',
            'segments': current_segments
        })
        
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON file format'}), 400
    except Exception as e:
        return jsonify({'error': f'Error reading segments file: {str(e)}'}), 500

@app.route('/speakers', methods=['GET'])
def get_speakers():
    """Get the current speaker configuration"""
    try:
        speakers = load_speaker_config()
        return jsonify(speakers)
    except Exception as e:
        return jsonify({'error': f'Error loading speakers: {str(e)}'}), 500

@app.route('/update_segment_speaker', methods=['POST'])
def update_segment_speaker():
    """Update the speaker assignment for a specific segment"""
    global current_segments
    
    if not current_video:
        return jsonify({'error': 'No video loaded'}), 400
    
    data = request.get_json()
    segment_id = data.get('segment_id')
    speaker = data.get('speaker', '').strip()
    
    if not segment_id:
        return jsonify({'error': 'No segment ID provided'}), 400
    
    # Find and update the segment
    segment_found = False
    for segment in current_segments:
        if segment['id'] == segment_id:
            segment['speaker'] = speaker
            segment_found = True
            break
    
    if not segment_found:
        return jsonify({'error': 'Segment not found'}), 404
    
    return jsonify({
        'success': True,
        'message': f'Speaker updated to "{speaker}"',
        'segment': next(s for s in current_segments if s['id'] == segment_id)
    })

@app.route('/update_segment_text', methods=['POST'])
def update_segment_text():
    """Update the text content for a specific segment"""
    global current_segments
    
    if not current_video:
        return jsonify({'error': 'No video loaded'}), 400
    
    data = request.get_json()
    segment_id = data.get('segment_id')
    text = data.get('text', '').strip()
    
    if not segment_id:
        return jsonify({'error': 'No segment ID provided'}), 400
    
    # Find and update the segment
    segment_found = False
    for segment in current_segments:
        if segment['id'] == segment_id:
            segment['text'] = text
            segment_found = True
            break
    
    if not segment_found:
        return jsonify({'error': 'Segment not found'}), 404
    
    return jsonify({
        'success': True,
        'message': f'Segment text updated successfully',
        'segment': next(s for s in current_segments if s['id'] == segment_id)
    })

@app.route('/add_custom_speaker', methods=['POST'])
def add_custom_speaker():
    """Add a custom speaker label to the configuration"""
    data = request.get_json()
    speaker_name = data.get('speaker_name', '').strip()
    print(speaker_name)
    
    if not speaker_name:
        return jsonify({'error': 'No speaker name provided'}), 400
    
    try:
        # Load current speaker config
        speakers = load_speaker_config()
        
        # Check if speaker already exists
        if any(s['name'] == speaker_name for s in speakers):
            return jsonify({'error': 'Speaker already exists'}), 400
        
        # Add new speaker
        new_speaker = {
            'name': speaker_name,
            'description': f'Custom speaker: {speaker_name}',
            'utterances': []
        }
        speakers.append(new_speaker)
        
        # Save updated config
        config_path = os.path.join('data', 'speaker_dict.json')
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(speakers, f, indent=2, ensure_ascii=False)
        
        return jsonify({
            'success': True,
            'message': f'Custom speaker "{speaker_name}" added successfully',
            'speaker': new_speaker
        })
        
    except Exception as e:
        return jsonify({'error': f'Error adding custom speaker: {str(e)}'}), 500

@app.route('/serve_video/<filename>')
def serve_video(filename):
    """Serve video files from the current video path"""
    global current_video
    
    if not current_video or not current_video.get('filepath'):
        return jsonify({'error': 'No video loaded'}), 400
    
    video_path = current_video['filepath']
    
    # Security: ensure the path is within allowed directories
    allowed_dirs = [
        str(Path.cwd()),  # Current working directory
        str(Path.cwd().parent),  # Parent directory
        str(Path.home())  # Home directory
    ]
    
    file_path = Path(video_path).resolve()
    is_allowed = any(str(file_path).startswith(allowed_dir) for allowed_dir in allowed_dirs)
    
    if not is_allowed:
        return jsonify({'error': 'Access denied'}), 403
    
    if not file_path.exists():
        return jsonify({'error': 'File not found'}), 404
    
    # Determine MIME type based on file extension
    file_ext = file_path.suffix.lower()
    mime_types = {
        '.mp4': 'video/mp4',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.wmv': 'video/x-ms-wmv',
        '.flv': 'video/x-flv',
        '.webm': 'video/webm',
        '.mkv': 'video/x-matroska',
        '.m4v': 'video/x-m4v'
    }
    
    mimetype = mime_types.get(file_ext, 'video/mp4')
    
    # Serve the video file
    return send_file(
        file_path,
        mimetype=mimetype,
        as_attachment=False
    )

@app.route('/add_segment', methods=['POST'])
def add_segment():
    """Add a new labeled segment"""
    global current_segments
    
    data = request.get_json()
    segment = {
        'id': str(uuid.uuid4()),
        'speaker': data['speaker'],
        'start': float(data['start']),
        'end': float(data['end']),
        'notes': data.get('notes', '')
    }
    
    current_segments.append(segment)
    return jsonify({'success': True, 'segment': segment})

@app.route('/update_segment', methods=['POST'])
def update_segment():
    """Update an existing segment"""
    global current_segments
    
    data = request.get_json()
    segment_id = data['id']
    
    for segment in current_segments:
        if segment['id'] == segment_id:
            segment['speaker'] = data['speaker']
            segment['start'] = float(data['start'])
            segment['end'] = float(data['end'])
            segment['notes'] = data.get('notes', '')
            return jsonify({'success': True, 'segment': segment})
    
    return jsonify({'error': 'Segment not found'}), 404

@app.route('/delete_segment', methods=['POST'])
def delete_segment():
    """Delete a segment"""
    global current_segments
    
    data = request.get_json()
    segment_id = data['id']
    
    current_segments = [s for s in current_segments if s['id'] != segment_id]
    return jsonify({'success': True})

@app.route('/get_segments')
def get_segments():
    """Get all current segments"""
    return jsonify(current_segments)

@app.route('/export_labels')
def export_labels():
    """Export labels in the required format for evaluation"""
    if not current_segments:
        return jsonify({'error': 'No segments to export'}), 400
    
    # Sort segments by start time
    sorted_segments = sorted(current_segments, key=lambda x: x['start'])
    
    export_data = []
    for segment in sorted_segments:
        export_data.append({
            'speaker': segment['speaker'],
            'start': segment['start'],
            'end': segment['end']
        })
    
    return jsonify(export_data)

@app.route('/save_labels', methods=['POST'])
def save_labels():
    """Save labels to a file"""
    data = request.get_json()
    filename = data.get('filename', f'labels_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    with open(filepath, 'w') as f:
        json.dump(data['labels'], f, indent=2)
    
    return jsonify({'success': True, 'filename': filename})

@app.route('/load_labels', methods=['POST'])
def load_labels():
    """Load labels from a file"""
    global current_segments
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file:
        try:
            content = file.read().decode('utf-8')
            labels = json.loads(content)
            current_segments = labels
            return jsonify({'success': True, 'segments': labels})
        except Exception as e:
            return jsonify({'error': f'Error loading file: {str(e)}'}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

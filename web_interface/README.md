# Video Speaker Labeling Web Interface

A Flask-based web application for labeling video segments with speaker information. This interface allows users to work with locally stored video files, create time-based segments, and label them with specific speakers for use in speaker diarization evaluation.

## Features

- **Local Video Loading**: Work with video files stored on your local system without uploading
- **Interactive Video Player**: HTML5 video player with controls for precise time navigation
- **Segment Creation**: Create labeled segments with start/end times and speaker assignments
- **Real-time Editing**: Edit existing segments with inline form updates
- **Speaker Configuration**: Automatic loading of speakers from the existing `speaker_dict.json` configuration
- **Export/Import**: Save and load labeling data in JSON format compatible with the evaluation framework
- **Responsive Design**: Modern, mobile-friendly interface built with Bootstrap 5

## Installation

1. **Navigate to the web interface directory:**
   ```bash
   cd web_interface
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Ensure speaker configuration exists:**
   The application will automatically look for `../end_to_end/speaker_dict.json` to load available speakers. If this file doesn't exist, it will use default speaker names.

## Usage

### Starting the Application

1. **Run the Flask application:**
   ```bash
   python app.py
   # or
   python run.py
   ```

2. **Open your web browser and navigate to:**
   ```
   http://localhost:5000
   ```

### Video Labeling Workflow

1. **Load Video:**
   - Enter the full path to your video file in the "Video File Path" field
   - Example: `/home/user/videos/simulation.mp4` or `C:\Users\user\Videos\simulation.mp4`
   - Click "Load Video" to process and display the video
   - Video metadata (duration, FPS, resolution) will be automatically extracted

2. **Create Segments:**
   - Use the video player to navigate to the start of a speech segment
   - Click "Set Start" to capture the current time
   - Navigate to the end of the segment and click "Set End"
   - Select the appropriate speaker from the dropdown
   - Add optional notes if needed
   - Click "Add Segment" to save the labeled segment

3. **Manage Segments:**
   - View all labeled segments in the list below the video player
   - Edit segments by clicking the edit button
   - Delete segments by clicking the delete button
   - Segments are automatically sorted by start time

4. **Export/Import:**
   - **Export**: Click "Export" to download labels in the required JSON format
   - **Save**: Click "Save" to save labels to the server with a custom filename
   - **Load**: Click "Load" to upload and load previously saved label files

### Label Format

The exported labels follow the exact format required by the evaluation framework:

```json
[
    {
        "speaker": "Doctor",
        "start": 0.0,
        "end": 5.2
    },
    {
        "speaker": "Patient", 
        "start": 5.2,
        "end": 10.7
    }
]
```

## Configuration

### Speaker Configuration

The application automatically loads speakers from `../end_to_end/speaker_dict.json`. This file should contain:

```json
{
    "Airway Nurse": [
        "Nope, still easy to manage",
        "Let me check the airway"
    ],
    "Doctor": [
        "Let's check the patient's vitals",
        "What's the blood pressure reading?"
    ]
}
```

The speaker names (keys) will be available in the labeling interface dropdown.

### Application Settings

Key configuration options in `app.py`:

- `UPLOAD_FOLDER`: Directory for storing saved labels (videos are not uploaded)
- `SECRET_KEY`: Flask secret key for session management

### Security Considerations

The application includes security measures for local file access:
- Only allows access to files within the current working directory, parent directory, or home directory
- Prevents access to system files outside of allowed directories
- Validates file existence before processing

## File Structure

```
web_interface/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── run.py                # Startup script
├── config_example.json   # Example speaker configuration
├── static/               # Static assets
│   ├── css/
│   │   └── style.css     # Custom styles
│   └── js/
│       └── main.js       # Frontend JavaScript
├── templates/            # HTML templates
│   └── index.html        # Main interface template
└── uploads/              # Directory for saved labels (not videos)
```

## Browser Compatibility

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Video Formats**: MP4, WebM, OGV (depends on browser support)
- **JavaScript**: ES6+ features required
- **Local Files**: Some browsers may have restrictions on `file://` protocol

## Troubleshooting

### Common Issues

1. **Video won't load:**
   - Check if the file path is correct and absolute
   - Ensure the video file exists and is accessible
   - Verify the video format is supported by your browser
   - Check browser console for errors

2. **Speakers not loading:**
   - Verify `../end_to_end/speaker_dict.json` exists
   - Check file format and permissions
   - Restart the Flask application

3. **Video player issues:**
   - Try different video formats (MP4 is most reliable)
   - Check browser video codec support
   - Ensure video file is not corrupted
   - Some browsers restrict `file://` protocol - try using Chrome or Firefox

4. **Permission errors:**
   - Ensure the Flask application has read access to the video file
   - Check file permissions on the video file
   - Verify the file path is within allowed directories

### Performance Tips

- **Large Videos**: For very long videos, consider splitting into smaller segments
- **Browser**: Use Chrome or Firefox for best performance and local file support
- **Memory**: Close other browser tabs to free up memory
- **File System**: Store videos on fast storage (SSD) for better playback performance

## Integration with Evaluation Framework

The exported labels from this interface are directly compatible with your existing evaluation framework. Simply:

1. Use this interface to create ground truth labels
2. Export the labels as JSON
3. Use the exported file with the `--evaluate` flag in `run_everything.py`

## Development

### Adding New Features

- **New Routes**: Add to `app.py` following the existing pattern
- **Frontend Logic**: Extend `static/js/main.js`
- **Styling**: Modify `static/css/style.css`

### Testing

- Test with various video formats and sizes
- Verify speaker configuration loading
- Check responsive design on different screen sizes
- Test with different file path formats (absolute, relative)

## License

This interface is part of the Inspire Project and follows the same licensing terms.

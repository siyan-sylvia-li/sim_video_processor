// Video Speaker Labeling Interface - Main JavaScript

// Global variables
let currentVideo = null;
let currentSegments = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updateLoadSegmentsButton();
    
    // Load speaker configuration
    loadSpeakerConfig();
});

function initializeEventListeners() {
    // Video path form
    document.getElementById('videoPathForm').addEventListener('submit', handleVideoPath);
    
    // Segments form
    document.getElementById('segmentsForm').addEventListener('submit', handleLoadSegments);
    
    // Custom speaker form
    document.getElementById('customSpeakerForm').addEventListener('submit', handleAddCustomSpeaker);
    
    // Segment creation form
    document.getElementById('segmentForm').addEventListener('submit', handleAddSegment);
    
    // Export/Import buttons
    document.getElementById('exportBtn').addEventListener('click', handleExport);
    document.getElementById('importBtn').addEventListener('click', handleImport);
    
    // File input change
    document.getElementById('importFile').addEventListener('change', handleImportFileChange);
    
    // Video player time update for real-time display
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        videoPlayer.addEventListener('timeupdate', updateTimeDisplay);
    }
}

async function handleVideoPath(event) {
    event.preventDefault();
    
    const videoPath = document.getElementById('videoPath').value.trim();
    
    if (!videoPath) {
        showAlert('Please enter a video file path', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/load_video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ video_path: videoPath })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentVideo = {
                filename: result.filename,
                filepath: result.filepath,
                video_url: result.video_url,
                duration: result.duration,
                fps: result.fps,
                width: result.width,
                height: result.height
            };
            
            // Update UI
            document.getElementById('videoContainer').style.display = 'block';
            document.getElementById('noVideo').style.display = 'none';
            document.getElementById('segmentCreation').style.display = 'block';
            document.getElementById('segmentsList').style.display = 'block';
            
            // Set video source - use the Flask-served URL
            const videoPlayer = document.getElementById('videoPlayer');
            console.log('Setting video source to:', result.video_url);
            console.log('Video player element:', videoPlayer);
            console.log('Current video object:', currentVideo);
            
            videoPlayer.src = result.video_url;
            
            // Add error handling for video loading
            videoPlayer.onerror = function() {
                console.error('Video loading error:', videoPlayer.error);
                console.error('Video error details:', {
                    code: videoPlayer.error?.code,
                    message: videoPlayer.error?.message
                });
                showAlert('Error loading video. Please check the file path and try again.', 'danger');
            };
            
            videoPlayer.onloadstart = function() {
                console.log('Video loading started');
            };
            
            videoPlayer.oncanplay = function() {
                console.log('Video can start playing');
            };
            
            videoPlayer.onloadeddata = function() {
                console.log('Video data loaded');
            };
            
            // Update video info
            document.getElementById('videoInfo').style.display = 'block';
            document.getElementById('duration').textContent = formatTime(result.duration);
            document.getElementById('fps').textContent = result.fps.toFixed(2);
            document.getElementById('resolution').textContent = `${result.width} × ${result.height}`;
            document.getElementById('filename').textContent = result.filename;
            
            // Clear segments when loading new video
            currentSegments = [];
            displaySegments();
            
            // Hide segments info
            document.getElementById('segmentsInfo').style.display = 'none';
            
            // Update load segments button
            updateLoadSegmentsButton();
            
            showAlert('Video loaded successfully!', 'success');
            
            // Clear form
            document.getElementById('videoPathForm').reset();
            
        } else {
            showAlert(result.error || 'Failed to load video', 'danger');
        }
    } catch (error) {
        console.error('Video loading error:', error);
        showAlert('Failed to load video. Please check the file path and try again.', 'danger');
    }
}

async function handleSegmentCreation(event) {
    event.preventDefault();
    
    const startTime = parseFloat(document.getElementById('startTime').value);
    const endTime = parseFloat(document.getElementById('endTime').value);
    const speaker = document.getElementById('speaker').value;
    const notes = document.getElementById('notes').value;
    
    if (!startTime || !endTime || !speaker) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }
    
    if (startTime >= endTime) {
        showAlert('Start time must be before end time', 'danger');
        return;
    }
    
    if (currentVideo && endTime > currentVideo.duration) {
        showAlert('End time cannot exceed video duration', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/add_segment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start: startTime,
                end: endTime,
                speaker: speaker,
                notes: notes
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            segments.push(result.segment);
            renderSegments();
            document.getElementById('segmentForm').reset();
            showAlert('Segment added successfully!', 'success');
        } else {
            showAlert(result.error || 'Failed to add segment', 'danger');
        }
    } catch (error) {
        console.error('Segment creation error:', error);
        showAlert('Failed to add segment. Please try again.', 'danger');
    }
}

function setCurrentTime(type) {
    const videoPlayer = document.getElementById('videoPlayer');
    if (!videoPlayer.src) {
        showAlert('Please load a video first', 'warning');
        return;
    }
    
    const currentTime = videoPlayer.currentTime;
    
    if (type === 'start') {
        document.getElementById('startTime').value = currentTime.toFixed(1);
    } else if (type === 'end') {
        document.getElementById('endTime').value = currentTime.toFixed(1);
    }
}

function updateTimeDisplay() {
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer.src) {
        // You can add a real-time time display here if needed
        // For example, showing current time in the segment creation form
    }
}

function renderSegments() {
    const container = document.getElementById('segmentsContainer');
    
    if (segments.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No segments created yet</p>';
        return;
    }
    
    // Sort segments by start time
    const sortedSegments = [...segments].sort((a, b) => a.start - b.start);
    
    container.innerHTML = sortedSegments.map(segment => `
        <div class="segment-item" data-segment-id="${segment.id}">
            <div class="segment-header">
                <div>
                    <span class="segment-speaker">${segment.speaker}</span>
                    <span class="segment-time ms-3">
                        ${formatTime(segment.start)} - ${formatTime(segment.end)}
                    </span>
                </div>
                <div class="segment-actions">
                    <button class="btn btn-outline-primary btn-sm" onclick="editSegment('${segment.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteSegment('${segment.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${segment.notes ? `<div class="segment-notes">${segment.notes}</div>` : ''}
        </div>
    `).join('');
}

function editSegment(segmentId) {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;
    
    // Populate form with segment data
    document.getElementById('startTime').value = segment.start;
    document.getElementById('endTime').value = segment.end;
    document.getElementById('speakerSelect').value = segment.speaker;
    document.getElementById('notes').value = segment.notes || '';
    
    // Change form button to update mode
    const submitBtn = document.querySelector('#segmentForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>Update Segment';
    submitBtn.classList.remove('btn-success');
    submitBtn.classList.add('btn-warning');
    
    // Store the segment being edited
    submitBtn.dataset.editingSegment = segmentId;
    
    // Scroll to form
    document.getElementById('segmentCreation').scrollIntoView({ behavior: 'smooth' });
}

async function deleteSegment(segmentId) {
    if (!confirm('Are you sure you want to delete this segment?')) {
        return;
    }
    
    try {
        const response = await fetch('/delete_segment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: segmentId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            segments = segments.filter(s => s.id !== segmentId);
            renderSegments();
            showAlert('Segment deleted successfully!', 'success');
        } else {
            showAlert(result.error || 'Failed to delete segment', 'danger');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('Failed to delete segment. Please try again.', 'danger');
    }
}

async function exportLabels() {
    if (segments.length === 0) {
        showAlert('No segments to export', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/export_labels');
        const result = await response.json();
        
        if (result.error) {
            showAlert(result.error, 'danger');
            return;
        }
        
        // Create and download file
        const dataStr = JSON.stringify(result, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `labels_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();
        
        showAlert('Labels exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showAlert('Failed to export labels. Please try again.', 'danger');
    }
}

async function saveLabels() {
    if (segments.length === 0) {
        showAlert('No segments to save', 'warning');
        return;
    }
    
    const filename = prompt('Enter filename (without extension):', `labels_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`);
    if (!filename) return;
    
    try {
        const response = await fetch('/save_labels', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: `${filename}.json`,
                labels: segments
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Labels saved as ${result.filename}`, 'success');
        } else {
            showAlert(result.error || 'Failed to save labels', 'danger');
        }
    } catch (error) {
        console.error('Save error:', error);
        showAlert('Failed to save labels. Please try again.', 'danger');
    }
}

function loadLabels() {
    document.getElementById('loadFileInput').click();
}

async function handleLoadFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/load_labels', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            segments = result.segments;
            renderSegments();
            showAlert('Labels loaded successfully!', 'success');
        } else {
            showAlert(result.error || 'Failed to load labels', 'danger');
        }
    } catch (error) {
        console.error('Load error:', error);
        showAlert('Failed to load labels. Please try again.', 'danger');
    }
    
    // Reset file input
    event.target.value = '';
}

async function loadSegments() {
    try {
        const response = await fetch('/get_segments');
        const result = await response.json();
        segments = result;
        renderSegments();
    } catch (error) {
        console.error('Failed to load segments:', error);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
}

function showAlert(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of page
    const container = document.querySelector('.container-fluid');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Handle form submission for editing segments
document.getElementById('segmentForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const editingSegmentId = submitBtn.dataset.editingSegment;
    
    if (editingSegmentId) {
        // Update existing segment
        await updateSegment(editingSegmentId);
        
        // Reset form to creation mode
        submitBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Add Segment';
        submitBtn.classList.remove('btn-warning');
        submitBtn.classList.add('btn-success');
        delete submitBtn.dataset.editingSegment;
    } else {
        // Create new segment
        await handleSegmentCreation(event);
    }
});

async function updateSegment(segmentId) {
    const startTime = parseFloat(document.getElementById('startTime').value);
    const endTime = parseFloat(document.getElementById('endTime').value);
    const speaker = document.getElementById('speaker').value;
    const notes = document.getElementById('notes').value;
    
    if (!startTime || !endTime || !speaker) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }
    
    if (startTime >= endTime) {
        showAlert('Start time must be before end time', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/update_segment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: segmentId,
                start: startTime,
                end: endTime,
                speaker: speaker,
                notes: notes
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update local segments array
            const index = segments.findIndex(s => s.id === segmentId);
            if (index !== -1) {
                segments[index] = result.segment;
            }
            
            renderSegments();
            document.getElementById('segmentForm').reset();
            showAlert('Segment updated successfully!', 'success');
        } else {
            showAlert(result.error || 'Failed to update segment', 'danger');
        }
    } catch (error) {
        console.error('Update error:', error);
        showAlert('Failed to update segment. Please try again.', 'danger');
    }
}

async function handleLoadSegments(event) {
    event.preventDefault();
    
    const segmentsFilePath = document.getElementById('segmentsFilePath').value.trim();
    
    if (!segmentsFilePath) {
        showAlert('Please enter a segments file path', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/load_segments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ segments_file_path: segmentsFilePath })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update segments list
            currentSegments = result.segments;
            displaySegments();
            
            // Update segments info display
            document.getElementById('segmentsInfo').style.display = 'block';
            document.getElementById('totalSegments').textContent = result.segments.length;
            document.getElementById('segmentsSource').textContent = segmentsFilePath.split('/').pop();
            
            showAlert(result.message, 'success');
            
            // Clear form
            document.getElementById('segmentsForm').reset();
            
        } else {
            showAlert(result.error || 'Failed to load segments', 'danger');
        }
    } catch (error) {
        console.error('Segments loading error:', error);
        showAlert('Failed to load segments. Please check the file path and try again.', 'danger');
    }
}

function updateLoadSegmentsButton() {
    const loadSegmentsBtn = document.getElementById('loadSegmentsBtn');
    if (currentVideo) {
        loadSegmentsBtn.disabled = false;
        loadSegmentsBtn.classList.remove('btn-secondary');
        loadSegmentsBtn.classList.add('btn-success');
    } else {
        loadSegmentsBtn.disabled = true;
        loadSegmentsBtn.classList.remove('btn-success');
        loadSegmentsBtn.classList.add('btn-secondary');
    }
}

async function handleAddSegment(event) {
    event.preventDefault();
    
    if (!currentVideo) {
        showAlert('Please load a video first', 'warning');
        return;
    }
    
    const startTime = parseFloat(document.getElementById('startTime').value);
    const endTime = parseFloat(document.getElementById('endTime').value);
    const speaker = document.getElementById('speaker').value;
    const notes = document.getElementById('notes').value;
    
    if (startTime >= endTime) {
        showAlert('Start time must be less than end time', 'danger');
        return;
    }
    
    if (endTime > currentVideo.duration) {
        showAlert('End time cannot exceed video duration', 'danger');
        return;
    }
    
    const segment = {
        id: Date.now().toString(),
        start_time: startTime,
        end_time: endTime,
        speaker: speaker,
        notes: notes
    };
    
    currentSegments.push(segment);
    displaySegments();
    
    // Clear form
    document.getElementById('segmentForm').reset();
    
    showAlert('Segment added successfully!', 'success');
}

async function handleExport() {
    if (!currentVideo || currentSegments.length === 0) {
        showAlert('No segments to export', 'warning');
        return;
    }
    
    const exportData = {
        video_filename: currentVideo.filename,
        video_duration: currentVideo.duration,
        segments: currentSegments,
        export_date: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `segments_${currentVideo.filename.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showAlert('Segments exported successfully!', 'success');
}

function handleImport() {
    document.getElementById('importFile').click();
}

function handleImportFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            if (importData.segments && Array.isArray(importData.segments)) {
                currentSegments = importData.segments;
                displaySegments();
                showAlert(`Successfully imported ${importData.segments.length} segments`, 'success');
            } else {
                showAlert('Invalid import file format', 'danger');
            }
        } catch (error) {
            showAlert('Error parsing import file', 'danger');
        }
    };
    reader.readAsText(file);
    
    // Clear the file input
    event.target.value = '';
}

function displaySegments() {
    const segmentsContainer = document.getElementById('segmentsList');
    
    if (!currentSegments || currentSegments.length === 0) {
        segmentsContainer.innerHTML = '<p class="text-muted">No segments defined yet.</p>';
        return;
    }
    
    let segmentsHTML = '';
    currentSegments.forEach((segment, index) => {
        segmentsHTML += `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <strong>${formatTime(segment.start_time)} - ${formatTime(segment.end_time)}</strong>
                        </div>
                        <div class="col-md-2">
                            <select class="form-select form-select-sm" 
                                    onchange="updateSegmentSpeaker('${segment.id}', this.value)">
                                <option value="">Select Speaker</option>
                                ${generateSpeakerOptions(segment.speaker)}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">${segment.notes || ''}</small>
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="seekToTime(${segment.start_time})">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                        <div class="col-md-1">
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteSegment(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    ${segment.text ? `<div class="row mt-2"><div class="col-12"><small class="text-muted"><em>"${segment.text}"</em></small></div></div>` : ''}
                </div>
            </div>
        `;
    });
    
    segmentsContainer.innerHTML = segmentsHTML;
}

function generateSpeakerOptions(selectedSpeaker) {
    const speakerSelect = document.getElementById('speaker');
    if (!speakerSelect) return '';
    
    let options = '';
    Array.from(speakerSelect.options).slice(1).forEach(speaker => { // Skip "Select Speaker"
        const selected = speaker.value === selectedSpeaker ? 'selected' : '';
        options += `<option value="${speaker.value}" ${selected}>${speaker.textContent}</option>`;
    });
    return options;
}

function deleteSegment(index) {
    if (confirm('Are you sure you want to delete this segment?')) {
        currentSegments.splice(index, 1);
        displaySegments();
        showAlert('Segment deleted successfully!', 'success');
    }
}

function seekToTime(time) {
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer.src) {
        videoPlayer.currentTime = time;
        videoPlayer.play();
    }
}

async function handleAddCustomSpeaker(event) {
    event.preventDefault();
    
    const speakerName = document.getElementById('customSpeakerName').value.trim();
    
    if (!speakerName) {
        showAlert('Please enter a speaker name', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/add_custom_speaker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ speaker_name: speakerName })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            
            // Reload speakers list
            await loadSpeakerConfig();
            displaySpeakers();
            
            // Refresh segments display to include new speaker in dropdowns
            if (currentSegments && currentSegments.length > 0) {
                displaySegments();
            }
            
            // Clear form
            document.getElementById('customSpeakerForm').reset();
            
        } else {
            showAlert(result.error || 'Failed to add custom speaker', 'danger');
        }
    } catch (error) {
        console.error('Error adding custom speaker:', error);
        showAlert('Failed to add custom speaker. Please try again.', 'danger');
    }
}

async function updateSegmentSpeaker(segmentId, speaker) {
    try {
        const response = await fetch('/update_segment_speaker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                segment_id: segmentId, 
                speaker: speaker 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update the segment in our local array
            const segment = currentSegments.find(s => s.id === segmentId);
            if (segment) {
                segment.speaker = speaker;
            }
            
            showAlert(result.message, 'success');
        } else {
            showAlert(result.error || 'Failed to update speaker', 'danger');
        }
    } catch (error) {
        console.error('Error updating segment speaker:', error);
        showAlert('Failed to update speaker. Please try again.', 'danger');
    }
}

function displaySpeakers() {
    const speakersContainer = document.getElementById('speakersContainer');
    
    // Get the speaker select element to extract current speakers
    const speakerSelect = document.getElementById('speaker');
    const speakers = Array.from(speakerSelect.options).slice(1); // Skip the first "Select Speaker" option
    
    if (speakers.length === 0) {
        speakersContainer.innerHTML = '<p class="text-muted">No speakers available</p>';
        return;
    }
    
    let speakersHTML = '';
    speakers.forEach(speaker => {
        speakersHTML += `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge bg-primary">${speaker.textContent}</span>
                <small class="text-muted">${speaker.value}</small>
            </div>
        `;
    });
    
    speakersContainer.innerHTML = speakersHTML;
}

async function loadSpeakerConfig() {
    try {
        const response = await fetch('/speakers');
        const speakers = await response.json();
        
        const speakerSelect = document.getElementById('speaker');
        speakerSelect.innerHTML = '<option value="">Select Speaker</option>';
        
        speakers.forEach(speaker => {
            const option = document.createElement('option');
            option.value = speaker.name;
            option.textContent = speaker.name;
            speakerSelect.appendChild(option);
        });
        
        // Update speakers display
        displaySpeakers();
        
    } catch (error) {
        console.error('Error loading speaker configuration:', error);
    }
}

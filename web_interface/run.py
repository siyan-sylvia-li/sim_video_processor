#!/usr/bin/env python3
"""
Startup script for the Video Speaker Labeling Web Interface
"""

import os
import sys
from pathlib import Path

# Add the parent directory to the path so we can import from end_to_end
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

if __name__ == '__main__':
    from app import app
    
    print("=" * 60)
    print("Video Speaker Labeling Web Interface")
    print("=" * 60)
    print(f"Starting server on http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

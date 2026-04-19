#!/usr/bin/env python3
"""
Suno Track Downloader
Downloads AI-generated music from Suno API URLs.

Usage:
    python download_suno.py <audio_id_or_url> [output_dir]
    python download_suno.py --batch ids.txt [output_dir]
    python download_suno.py --all [output_dir]

Examples:
    python download_suno.py abc123
    python download_suno.py https://cdn1.suno.ai/abc123.mp3 ./my-music
    python download_suno.py --batch my-songs.txt
    python download_suno.py --all ./downloads
"""

import sys
import os
import re
import requests
import argparse
from pathlib import Path
from urllib.parse import urlparse

SUNO_API_URL = os.environ.get("SUNO_API_URL", "https://suno.alxtools.com")
DOWNLOAD_DIR = os.environ.get("SUNO_DOWNLOAD_DIR", "./suno-downloads")


def get_audio_info(audio_id):
    """Get audio info from the API"""
    url = f"{SUNO_API_URL}/api/get"
    params = {"ids": audio_id}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        if data and len(data) > 0:
            return data[0]
        return None
    except Exception as e:
        print(f"Error fetching info for {audio_id}: {e}")
        return None


def download_file(url, output_path, filename):
    """Download a file with progress"""
    try:
        print(f"Downloading: {filename}")
        response = requests.get(url, stream=True, timeout=120)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\rProgress: {percent:.1f}%", end='', flush=True)
        
        print(f"\n✓ Saved: {output_path}")
        return True
        
    except Exception as e:
        print(f"\n✗ Error downloading {filename}: {e}")
        return False


def sanitize_filename(name):
    """Clean filename for filesystem"""
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = name.strip('. ')
    return name or "untitled"


def download_track(audio_id, output_dir=DOWNLOAD_DIR, info=None):
    """Download a single track by ID"""
    if not info:
        info = get_audio_info(audio_id)
    
    if not info:
        print(f"✗ Could not find track: {audio_id}")
        return False
    
    audio_url = info.get('audio_url')
    title = info.get('title', 'untitled')
    track_id = info.get('id', audio_id)
    
    if not audio_url:
        print(f"✗ No audio URL for: {title}")
        return False
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate filename
    safe_title = sanitize_filename(title)
    ext = Path(urlparse(audio_url).path).suffix or '.mp3'
    filename = f"{safe_title}_{track_id}{ext}"
    output_path = os.path.join(output_dir, filename)
    
    # Download
    success = download_file(audio_url, output_path, filename)
    
    # Also download cover image if available
    image_url = info.get('image_url')
    if image_url and success:
        img_ext = Path(urlparse(image_url).path).suffix or '.jpg'
        img_filename = f"{safe_title}_{track_id}_cover{img_ext}"
        img_output_path = os.path.join(output_dir, img_filename)
        download_file(image_url, img_output_path, img_filename)
    
    return success


def download_all(output_dir=DOWNLOAD_DIR):
    """Download all tracks"""
    print("Fetching all tracks...")
    
    try:
        response = requests.get(f"{SUNO_API_URL}/api/get", timeout=30)
        response.raise_for_status()
        tracks = response.json()
        
        if not tracks:
            print("No tracks found.")
            return
        
        print(f"Found {len(tracks)} tracks")
        
        success_count = 0
        for track in tracks:
            if download_track(track.get('id'), output_dir, track):
                success_count += 1
        
        print(f"\n{'='*50}")
        print(f"Downloaded {success_count}/{len(tracks)} tracks to: {output_dir}")
        
    except Exception as e:
        print(f"Error fetching tracks: {e}")


def main():
    parser = argparse.ArgumentParser(
        description='Download Suno AI-generated music tracks',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s abc123                    Download single track
  %(prog)s abc123 ./my-music         Download to specific directory
  %(prog)s --batch ids.txt           Download from list of IDs
  %(prog)s --all                     Download all tracks
        """
    )
    
    parser.add_argument('input', nargs='?', help='Audio ID or URL to download')
    parser.add_argument('output_dir', nargs='?', default=DOWNLOAD_DIR, 
                        help=f'Output directory (default: {DOWNLOAD_DIR})')
    parser.add_argument('--batch', '-b', metavar='FILE',
                        help='Download multiple tracks from a file (one ID per line)')
    parser.add_argument('--all', '-a', action='store_true',
                        help='Download all tracks from your library')
    parser.add_argument('--api-url', default=SUNO_API_URL,
                        help=f'Suno API URL (default: {SUNO_API_URL})')
    
    args = parser.parse_args()
    
    global SUNO_API_URL
    SUNO_API_URL = args.api_url
    
    if args.all:
        download_all(args.output_dir)
    elif args.batch:
        if not os.path.exists(args.batch):
            print(f"✗ File not found: {args.batch}")
            sys.exit(1)
        
        with open(args.batch, 'r') as f:
            ids = [line.strip() for line in f if line.strip()]
        
        print(f"Downloading {len(ids)} tracks from list...")
        success_count = 0
        for audio_id in ids:
            if download_track(audio_id, args.output_dir):
                success_count += 1
        
        print(f"\n{'='*50}")
        print(f"Downloaded {success_count}/{len(ids)} tracks to: {args.output_dir}")
        
    elif args.input:
        # Check if it's a URL or ID
        if args.input.startswith('http'):
            # Extract ID from URL
            match = re.search(r'/([a-f0-9-]+)\.', args.input)
            if match:
                audio_id = match.group(1)
            else:
                print("✗ Could not extract ID from URL")
                sys.exit(1)
        else:
            audio_id = args.input
        
        download_track(audio_id, args.output_dir)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
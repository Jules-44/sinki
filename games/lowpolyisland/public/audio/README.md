# Custom Audio Tracks Directory

Place your audio files (`.mp3`, `.ogg`, `.wav`, `.m4a`, `.flac`) in this directory (`public/audio/`).

## How to add tracks:

### Option A: Edit `playlist.json` in this folder:
```json
[
  {
    "title": "MY DRUM & BASS TRACK",
    "artist": "DJ ARTIST",
    "file": "track1.mp3",
    "bpm": 164,
    "locked": false
  },
  {
    "title": "SECRET ROOFTOP VIP",
    "artist": "NIGHT CRUISE",
    "file": "track2.mp3",
    "bpm": 168,
    "locked": true,
    "tapeId": "tape_metropolis_skyway"
  }
]
```

### Option B: Edit `src/config/audioTracks.js` in your codebase.

If no custom audio files are loaded or present, the game automatically plays the built-in atmospheric procedural DnB synthesizer.

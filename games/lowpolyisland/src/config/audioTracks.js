/**
 * Playlist Configuration & Cassette Tape Unlock Definitions
 *
 * How to add custom audio files:
 * 1. Put your audio file (.mp3, .ogg, .wav, .m4a) into `public/audio/<filename>`
 * 2. Add an entry to `CUSTOM_AUDIO_TRACKS` below with `file: '/audio/<filename>'`
 *
 * If `file` is provided and exists, AudioEngine plays the real audio file through
 * the Web Audio visualizer & Walkman player.
 * If no custom file is set (or if left blank), AudioEngine uses the built-in procedural DnB synth.
 */
export const CUSTOM_AUDIO_TRACKS = [
  // Examples (Uncomment and add your files):
  // {
  //   id: 'track_1',
  //   title: 'ATLANTIC DRIFT',
  //   artist: 'SUB FOCUS VIBES',
  //   file: '/audio/track1.mp3',
  //   bpm: 165,
  //   locked: false,
  // },
  // {
  //   id: 'tape_secret_1',
  //   title: 'CYBERPUNK HIGHWAY (VIP MIX)',
  //   artist: 'NEO SOUNDSYSTEM',
  //   file: '/audio/secret_dnb.mp3',
  //   bpm: 170,
  //   locked: true,
  //   tapeId: 'tape_skyway_ramp',
  //   unlockHint: 'Hidden on the Central Skyway Overpass',
  // }
];

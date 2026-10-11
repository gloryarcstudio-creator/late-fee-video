"""Import delivered sounds: python3 tools/audio/import.py IN_DIR OUT_DIR
For every name in OUT_DIR/audio.json: decode IN_DIR/<name>.(mp3|wav), peak-normalize to 0.89, loops get a 1 s tail of
their own start (the player loops inside the decoded buffer, see audio.js), re-encode (music 128k stereo, sfx 96k mono)
and update dur/loop in audio.json. Missing inputs keep the current file.
"""
import json, os, subprocess, sys, tempfile
import numpy as np
SR = 44100
inp, out = sys.argv[1], sys.argv[2]
man_p = os.path.join(out, 'audio.json'); man = json.load(open(man_p))
for name, m in man.items():
    src = next((os.path.join(inp, name + e) for e in ('.mp3', '.wav', '.ogg', '.flac') if os.path.exists(os.path.join(inp, name + e))), None)
    if not src: print(f'{name:16s} missing, kept'); continue
    ch = 2 if m['kind'] != 'sfx' else 1
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'f32le', '-ac', str(ch), '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    y = np.frombuffer(raw, '<f4').reshape(-1, ch).T.astype(float)
    # strip decoder padding at the end (pure digital silence only)
    if 'loop' not in m:  # a loop's silence is part of its rhythm; one-shots lose decoder padding
        nz = np.where(np.abs(y).max(0) > 1e-4)[0]; y = y[:, :nz[-1] + 1] if len(nz) else y
    y = y / (np.abs(y).max() or 1) * 0.89
    loop = None
    if 'loop' in m:
        loop = y.shape[1] / SR; tail = SR
        y = np.concatenate([y, np.tile(y, (1, tail // y.shape[1] + 1))[:, :tail]], axis=1)
    pcm = (np.clip(y.T, -1, 1) * 32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.raw', delete=False) as f: f.write(pcm.tobytes()); tmp = f.name
    dst = os.path.join(out, name + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', str(ch), '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '128k' if ch == 2 else '96k', dst], check=True); os.unlink(tmp)
    m['dur'] = round((loop if loop else y.shape[1] / SR), 3)
    if loop: m['loop'] = round(loop, 6)
    print(f"{name:16s} {m['dur']:6.2f}s {'loop' if loop else '    '} {os.path.getsize(dst) / 1024:6.1f} KB")
json.dump(man, open(man_p, 'w'), indent=1)

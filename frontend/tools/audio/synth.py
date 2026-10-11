"""Late Fee Video: every sound and music cue, synthesized offline (numpy + scipy), no samples.

usage: python3 tools/audio/synth.py OUT_DIR [--wav]
Writes OUT_DIR/<name>.mp3 and OUT_DIR/audio.json (loop lengths, volumes). Deterministic (fixed seeds).
Loops are rendered circularly and saved as loop + 1 s tail; the player loops [start, start+loop] where
start is the first non-silent sample, so MP3 encoder padding never reaches the seam.
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(1989)


# ---------- primitives ----------
def T(d): return np.arange(int(d * SR)) / SR
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)


def blep(t, dt):
    out = np.zeros_like(t)
    a = t < dt; x = t[a] / dt[a] if np.ndim(dt) else t[a] / dt; out[a] = x + x - x * x - 1
    b = t > 1 - (dt if not np.ndim(dt) else dt); x = (t[b] - 1) / (dt[b] if np.ndim(dt) else dt); out[b] = x * x + x + x + 1
    return out


def phase(freq, n):
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    return np.cumsum(f / SR) % 1.0, f / SR


def saw(freq, n, ph0=0.0):
    p, dt = phase(freq, n); p = (p + ph0) % 1.0
    return 2 * p - 1 - blep(p, dt)


def square(freq, n, pw=0.5):
    p, dt = phase(freq, n)
    return (saw(freq, n) - saw(freq, n, pw)) * 0.5  # pulse as a difference of saws


def sine(freq, n):
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def tri(freq, n):
    p, _ = phase(freq, n)
    return 2 * np.abs(2 * p - 1) - 1


def noise(n): return rng.uniform(-1, 1, n)


def env(n, a=0.005, d=0.1, s=0.0, r=0.05, hold=None):
    """ADSR over n samples; hold = gate length in s (default: n minus release)."""
    e = np.zeros(n); g = int((hold if hold is not None else n / SR - r) * SR)
    ia, idd = max(1, int(a * SR)), max(1, int(d * SR))
    t = np.arange(n)
    e = np.where(t < ia, t / ia, s + (1 - s) * np.exp(-(t - ia) / idd * 4))
    if g < n:
        lvl = e[min(g, n - 1)]
        tr = t[g:] - g; e[g:] = lvl * np.exp(-tr / max(1, r * SR) * 5)
    return e


def perc(n, d=0.2, a=0.002):
    t = np.arange(n); ia = max(1, int(a * SR))
    return np.where(t < ia, t / ia, np.exp(-(t - ia) / (d * SR) * 5))


def lp(x, fc, q=0.707):
    sos = signal.butter(2, min(fc, SR * 0.45), 'low', fs=SR, output='sos'); return signal.sosfilt(sos, x)


def hp(x, fc):
    sos = signal.butter(2, fc, 'high', fs=SR, output='sos'); return signal.sosfilt(sos, x)


def bp(x, lo, hi):
    sos = signal.butter(2, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'); return signal.sosfilt(sos, x)


def sweep_lp(x, f0, f1, block=256, curve=2.0):
    """Time-varying 2-pole low-pass (block-wise coefficients, continuous state)."""
    out = np.zeros_like(x); zi = np.zeros((1, 2)); n = len(x)
    for i in range(0, n, block):
        k = (i / max(1, n - 1)) ** curve; fc = f0 * (f1 / f0) ** k
        sos = signal.butter(2, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
        out[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
    return out


def sweep_bp(x, f0, f1, bw=0.5, block=256):
    out = np.zeros_like(x); zi = np.zeros((1, 2, 2))[0]; n = len(x)
    zi = np.zeros((2, 2))
    for i in range(0, n, block):
        k = i / max(1, n - 1); fc = f0 * (f1 / f0) ** k
        sos = signal.butter(2, [fc * (1 - bw / 2), min(fc * (1 + bw / 2), SR * 0.45)], 'band', fs=SR, output='sos')
        out[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
    return out


def _chunks(n, d):
    for i in range(0, n, d):
        yield i, min(n, i + d)


def comb(x, d, g):
    """Feedback comb y[n] = x[n] + g*y[n-d], computed d samples at a time (O(n))."""
    y = np.array(x, float); n = len(y)
    for i, e in _chunks(n, d):
        if i: y[i:e] += g * y[i - d:e - d]
    return y


def allpass(x, d, g):
    """Schroeder allpass y[n] = -g*x[n] + x[n-d] + g*y[n-d]."""
    x = np.asarray(x, float); y = -g * x; n = len(y)
    for i, e in _chunks(n, d):
        if i: y[i:e] += x[i - d:e - d] + g * y[i - d:e - d]
    return y


def reverb(x, size=1.0, damp=5000, mix=0.25, pre=0.01):
    """Small Schroeder room (mono in -> stereo out)."""
    x = np.concatenate([np.zeros(int(pre * SR)), x])[:len(x)]
    outs = []
    for off in (0, 23):
        y = sum(comb(lp(x, damp), int((d + off) * size), 0.80 + 0.02 * i) for i, d in enumerate((1116, 1188, 1277, 1356)))
        for d in (556, 441, 341):
            y = allpass(y, d + off, 0.5)
        outs.append(y * 0.12)
    return np.stack(outs) * mix


def delay(x, t, fb=0.35, n_taps=6, damp=3500):
    y = np.zeros_like(x); d = int(t * SR); cur = x
    for i in range(1, n_taps + 1):
        cur = lp(np.concatenate([np.zeros(d), cur])[:len(x)], damp) * fb; y += cur
    return y


def wow(x, depth_ms=1.1, rate=0.5, flutter_ms=0.18, frate=7.0, loop=None):
    """VHS wow/flutter via a time-varying read position. Periodic over `loop` seconds if given."""
    n = x.shape[-1]; t = np.arange(n) / SR
    if loop:
        rate = max(1, round(rate * loop)) / loop; frate = max(1, round(frate * loop)) / loop
    d = (depth_ms * (1 + np.sin(2 * np.pi * rate * t)) + flutter_ms * (1 + np.sin(2 * np.pi * frate * t + 1.3))) * SR / 1000
    pos = np.clip(np.arange(n) - d, 0, n - 1)
    if x.ndim == 1: return np.interp(pos, np.arange(n), x)
    return np.stack([np.interp(pos, np.arange(n), c) for c in x])


def hiss(n, lvl=0.012):
    return np.stack([bp(noise(n), 2500, 12000) * lvl, bp(noise(n), 2500, 12000) * lvl])


def st(x, pan=0.0):
    """Mono -> stereo with constant-power pan (-1..1)."""
    if x.ndim == 2: return x
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)]) * 1.4142


def place(buf, x, at):
    """Mix x into buf at time `at` (s); wraps around for circular (loop) buffers when buf.circular."""
    i = int(at * SR)
    if x.ndim == 1 and buf.ndim == 2: x = st(x)
    n = buf.shape[-1]; m = x.shape[-1]
    if i >= n: return
    end = min(n, i + m)
    buf[..., i:end] += x[..., :end - i]


def master(x, drive=1.2, top=12500, peak=0.89):
    x = lp(x, top) if x.ndim == 1 else np.stack([lp(c, top) for c in x])
    x = np.tanh(x * drive) / np.tanh(drive)
    m = np.max(np.abs(x)) or 1
    return x / m * peak


# ---------- instruments ----------
def pad(notes, dur, cutoff=1600, vol=0.18, a=0.4, r=0.6):
    n = int((dur + r) * SR); y = np.zeros(n)
    for m in notes:
        for det in (-0.08, 0, 0.07):
            y += saw(mtof(m + det), n, rng.random())
    y = y / (3 * max(1, len(notes))) * env(n, a=a, d=1.0, s=0.8, r=r, hold=dur)
    lfo = cutoff
    return lp(y, lfo) * vol * 2


def pluck(m, dur=0.25, vol=0.2, bright=4000, wave='sq'):
    n = int(dur * SR) + int(0.05 * SR)
    o = square(mtof(m), n) if wave == 'sq' else saw(mtof(m), n)
    e = perc(n, dur)
    return sweep_lp(o * e, bright, 500, curve=0.5) * vol


def bell(m, dur=0.8, vol=0.25):
    n = int(dur * SR); f = mtof(m)
    y = sine(f, n) + 0.5 * sine(f * 2.76, n) * perc(n, dur * 0.4) + 0.25 * sine(f * 5.4, n) * perc(n, dur * 0.2)
    return y * perc(n, dur) * vol


def bass(m, dur, vol=0.32, cutoff=700):
    n = int((dur + 0.03) * SR)
    y = saw(mtof(m), n) * 0.6 + square(mtof(m - 12), n) * 0.5
    y = sweep_lp(y * env(n, a=0.004, d=0.2, s=0.55, r=0.03, hold=dur), cutoff * 2.2, cutoff, curve=0.3)
    return y * vol


def brass(notes, dur, vol=0.22, a=0.03):
    n = int((dur + 0.25) * SR); y = np.zeros(n)
    for m in notes:
        for det in (-0.1, 0.1):
            y += saw(mtof(m + det), n, rng.random())
    e = env(n, a=a, d=0.25, s=0.7, r=0.25, hold=dur)
    return sweep_lp(y / (2 * len(notes)) * e, 4500, 1500, curve=0.4) * vol * 2


def lead(m, dur, vol=0.16, vib=0.18):
    n = int((dur + 0.15) * SR); t = np.arange(n) / SR
    f = mtof(m) * 2 ** (vib / 12 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.3, 0, 1))
    y = square(f, n, 0.3) * 0.5 + tri(f, n) * 0.6
    return lp(y * env(n, a=0.02, d=0.3, s=0.75, r=0.12, hold=dur), 3200) * vol


def kick(vol=0.9):
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 30)
    return (sine(f, n) * perc(n, 0.3) + lp(noise(n), 2000) * perc(n, 0.01) * 0.3) * vol


def snare(vol=0.5):
    n = int(0.3 * SR)
    return (bp(noise(n), 1200, 7000) * perc(n, 0.16) + sine(185, n) * perc(n, 0.06) * 0.6) * vol


def hat(vol=0.12, open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    return hp(noise(n), 7000) * perc(n, 0.22 if open_ else 0.035) * vol


def clap(vol=0.4):
    n = int(0.25 * SR); y = np.zeros(n); nz = bp(noise(n), 900, 5000)
    for k, off in enumerate((0, 0.009, 0.018)):
        i = int(off * SR); y[i:] += nz[i:] * perc(n - i, 0.012 if k < 2 else 0.18)
    return y * vol


def crash(vol=0.25, d=1.6):
    n = int(d * SR); return hp(noise(n), 4500) * perc(n, d, 0.003) * vol


def thud(f=90, d=0.12, vol=0.8):
    n = int(d * SR); t = np.arange(n) / SR
    return (sine(f + 60 * np.exp(-t * 60), n) * perc(n, d) + lp(noise(n), 1500) * perc(n, 0.015) * 0.5) * vol


def click(f=2400, vol=0.5):
    n = int(0.03 * SR)
    return (bp(noise(n), f * 0.6, f * 1.6) * perc(n, 0.006) + sine(f, n) * perc(n, 0.01) * 0.4) * vol


# ---------- music arrangement helpers ----------
CH = {  # chord tones (midi) per symbol, voiced around C4
    'Am9': [57, 60, 64, 67, 71], 'Fmaj7': [53, 57, 60, 64], 'Dm9': [50, 53, 57, 60, 64], 'Esus': [52, 57, 59, 64], 'E': [52, 56, 59, 64],
    'Am': [57, 60, 64], 'F': [53, 57, 60], 'C': [55, 60, 64], 'G': [55, 59, 62], 'Cmaj7': [55, 59, 64, 67], 'G6': [55, 59, 62, 64],
    'Em': [52, 55, 59], 'Dm': [50, 53, 57],
}
ROOT = {'Am9': 45, 'Fmaj7': 41, 'Dm9': 38, 'Esus': 40, 'E': 40, 'Am': 45, 'F': 41, 'C': 36, 'G': 43, 'Cmaj7': 36, 'G6': 43, 'Em': 40, 'Dm': 38}


def loop_buf(L): return np.zeros((2, int(round(L * SR))))


def render_loop(build, L, wow_ms=0.9):
    """Render 2 passes into a 2L buffer and keep the second: reverb/delay tails wrap into the start."""
    buf = np.zeros((2, int(round(2 * L * SR)) + int(2 * SR)))
    build(buf, 0.0); build(buf, L)
    n = int(round(L * SR))
    y = buf[:, n:2 * n].copy()
    y = wow(y, depth_ms=wow_ms, loop=L)
    y += hiss(y.shape[1], 0.006)
    return y


def mus_base():
    bpm = 90; b = 60 / bpm; L = 32 * b  # 8 bars
    prog = ['Am9', 'Fmaj7', 'Dm9', 'Esus', 'Am9', 'Fmaj7', 'Cmaj7', 'E']
    mel = [(4, 76, 1.5), (5.5, 74, 0.5), (6, 72, 1), (7, 71, 1), (8, 69, 2.5), (10.5, 72, 0.5), (11, 71, 1),
           (12, 68, 3), (16, 76, 1.5), (17.5, 79, 0.5), (18, 77, 1), (19, 76, 1), (20, 72, 2), (22, 74, 1), (23, 76, 1),
           (24, 79, 1.5), (25.5, 77, 0.5), (26, 76, 2), (28, 71, 3.5)]
    def build(buf, o):
        dry = np.zeros_like(buf); wet = np.zeros(buf.shape[1])
        for bar, c in enumerate(prog):
            t0 = o + bar * 4 * b
            place(dry, st(pad(CH[c], 4 * b, 1400, 0.16), 0), t0)
            for k in range(8):
                note = ROOT[c] + (12 if k in (3, 6) else 0)
                place(dry, bass(note, b * 0.45, 0.24, 520), t0 + k * b / 2)
            tones = CH[c]
            for k in range(8):
                p = pluck(tones[k % len(tones)] + 12, 0.2, 0.06, 3000)
                place(dry, st(p, -0.4 if k % 2 else 0.4), t0 + k * b / 2)
                i = int((t0 + k * b / 2) * SR); wet[i:i + len(p)] += p[:max(0, len(wet) - i)] * 0.8
            for beat in range(4):
                tb = t0 + beat * b
                if beat in (0, 2): place(dry, kick(0.75), tb)
                if beat == 2: place(dry, kick(0.45), tb + b * 0.75)
                if beat in (1, 3):
                    s = snare(0.32); place(dry, s, tb); i = int(tb * SR); wet[i:i + len(s)] += s[:max(0, len(wet) - i)] * 2.5
                place(dry, st(hat(0.07), 0.3), tb + b / 2); place(dry, st(hat(0.045), 0.3), tb)
        for s, m, d in mel:
            l = lead(m, d * b * 0.95, 0.11); place(dry, st(l, -0.1), o + s * b)
            i = int((o + s * b) * SR); wet[i:i + len(l)] += l[:max(0, len(wet) - i)] * 1.2
        buf += dry + reverb(wet, 1.3, 4500, 0.9) + st(delay(wet * 0.5, b * 0.75, 0.35), 0.2)
    return render_loop(build, L), L


def mus_bonus():
    bpm = 120; b = 60 / bpm; L = 32 * b  # 8 bars, 16 s
    prog = ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E']
    mel = [(0, 81, 0.5), (0.5, 79, 0.5), (1, 76, 1), (2, 72, 1), (3, 76, 1), (4, 77, 1.5), (5.5, 76, 0.5), (6, 72, 2),
           (8, 79, 1), (9, 76, 1), (10, 72, 1), (11, 74, 1), (12, 74, 3.5),
           (16, 81, 0.5), (16.5, 79, 0.5), (17, 76, 1), (18, 72, 1), (19, 76, 1), (20, 77, 1.5), (21.5, 81, 0.5), (22, 77, 2),
           (24, 74, 1), (25, 77, 1), (26, 74, 1), (27, 71, 1), (28, 68, 2), (30, 71, 2)]
    def build(buf, o):
        dry = np.zeros_like(buf); wet = np.zeros(buf.shape[1])
        for bar, c in enumerate(prog):
            t0 = o + bar * 4 * b
            place(dry, st(pad(CH[c], 4 * b, 2200, 0.13, a=0.08), 0), t0)
            for k in range(16):
                note = ROOT[c] + (12 if k % 2 else 0)
                place(dry, bass(note, b * 0.22, 0.22, 650), t0 + k * b / 4)
            tones = CH[c] + [CH[c][0] + 12]
            for k in range(16):
                p = pluck(tones[[0, 1, 2, 3, 2, 1][k % 6]] + 12, 0.14, 0.055, 4200)
                place(dry, st(p, 0.5 if k % 2 else -0.5), t0 + k * b / 4)
                i = int((t0 + k * b / 4) * SR); wet[i:i + len(p)] += p[:max(0, len(wet) - i)] * 0.5
            for beat in range(4):
                tb = t0 + beat * b
                place(dry, kick(0.8), tb)
                if beat in (1, 3):
                    s = mix(0.3, (0, clap(0.3)), (0, snare(0.22))); place(dry, s, tb); i = int(tb * SR); wet[i:i + len(s)] += s[:max(0, len(wet) - i)] * 2
                place(dry, st(hat(0.09, True), -0.3), tb + b / 2)
                place(dry, st(hat(0.04), 0.3), tb + b / 4); place(dry, st(hat(0.04), 0.3), tb + 3 * b / 4)
            if bar == 7:
                for k in range(4): place(dry, snare(0.12 + 0.05 * k), t0 + 3 * b + k * b / 4)
        for s, m, d in mel:
            l = lead(m, d * b * 0.9, 0.12); place(dry, st(l, 0.1), o + s * b)
            i = int((o + s * b) * SR); wet[i:i + len(l)] += l[:max(0, len(wet) - i)]
        buf += dry + reverb(wet, 1.0, 5000, 0.7) + st(delay(wet * 0.4, b * 0.75, 0.3), -0.2)
    return render_loop(build, L), L


def mus_bigwin():
    bpm = 124; b = 60 / bpm; L = 16 * b  # 4 bars
    prog = ['C', 'Am', 'F', 'G']
    def build(buf, o):
        dry = np.zeros_like(buf); wet = np.zeros(buf.shape[1])
        for bar, c in enumerate(prog):
            t0 = o + bar * 4 * b
            up = [n + 12 for n in CH[c]]
            for k, (at, d) in enumerate([(0, 1.4), (1.5, 0.4), (2, 0.4), (2.5, 1.2)]):
                br = brass(up, d * b, 0.2); place(dry, st(br, 0), t0 + at * b)
                i = int((t0 + at * b) * SR); wet[i:i + len(br)] += br[:max(0, len(wet) - i)] * 0.7
            for k in range(8):
                place(dry, bass(ROOT[c] + (12 if k % 2 else 0), b * 0.4, 0.24, 800), t0 + k * b / 2)
            for k in range(16):
                p = pluck(CH[c][k % 3] + 24, 0.1, 0.04, 6000, 'saw'); place(dry, st(p, 0.6 if k % 2 else -0.6), t0 + k * b / 4)
            for beat in range(4):
                tb = t0 + beat * b; place(dry, kick(0.8), tb)
                if beat in (1, 3):
                    s = snare(0.32); place(dry, s, tb); i = int(tb * SR); wet[i:i + len(s)] += s[:max(0, len(wet) - i)] * 2
                place(dry, st(hat(0.08, True), 0.3), tb + b / 2)
            if bar == 0: place(dry, st(crash(0.18), -0.2), t0)
        buf += dry + reverb(wet, 1.1, 6000, 0.8)
    return render_loop(build, L, 0.6), L


# ---------- stingers ----------
def oneshot(d): return np.zeros((2, int(d * SR)))


def finish(buf, wet=None, size=1.2, mix=0.8, tail_wow=0.7):
    if wet is not None:
        buf += reverb(wet, size, 5000, mix)
    buf = wow(buf, depth_ms=tail_wow)
    buf += hiss(buf.shape[1], 0.004)
    fade = int(0.08 * SR); buf[:, -fade:] *= np.linspace(1, 0, fade)
    return buf


def tape_stop(x, start, dur):
    """Slow the playback to a halt from `start` s over `dur` s (a tape-stop pitch dive)."""
    i0 = int(start * SR); n = int(dur * SR)
    rate = np.linspace(1, 0, n) ** 1.5
    pos = i0 + np.concatenate([[0], np.cumsum(rate)[:-1]])
    tail = np.stack([np.interp(pos, np.arange(x.shape[1]), c) for c in x]) * np.linspace(1, 0.2, n)
    return np.concatenate([x[:, :i0], tail], axis=1)


def stg_bonus_intro():
    d = 3.6; buf = oneshot(d); wet = np.zeros(buf.shape[1])
    place(buf, thud(70, 0.25, 0.7), 0.0); place(buf, click(1800, 0.4), 0.05); place(buf, click(1300, 0.4), 0.12)
    n = int(1.1 * SR); r = sweep_bp(noise(n), 300, 6000, 0.6) * np.linspace(0, 1, n) ** 2 * 0.35
    place(buf, st(r, 0), 0.25)
    for k, m in enumerate([57, 60, 64, 69, 72, 76]):
        p = pluck(m + 12, 0.25, 0.09, 5000); place(buf, st(p, (-1) ** k * 0.4), 0.3 + k * 0.17)
        i = int((0.3 + k * 0.17) * SR); wet[i:i + len(p)] += p[:len(wet) - i]
    hit = brass([57, 64, 69, 72, 76], 1.6, 0.42, 0.01); place(buf, st(hit), 1.35)
    i = int(1.35 * SR); wet[i:i + len(hit)] += hit[:len(wet) - i]
    place(buf, kick(0.9), 1.35); place(buf, st(crash(0.3, 2.2)), 1.35)
    return finish(buf, wet)


def stg_shift_over():
    d = 3.4; buf = oneshot(d); wet = np.zeros(buf.shape[1])
    for k, m in enumerate([76, 72, 69, 67, 64]):
        p = bell(m, 0.6, 0.18); place(buf, st(p, (-1) ** k * 0.3), k * 0.13)
        i = int(k * 0.13 * SR); wet[i:i + len(p)] += p[:len(wet) - i]
    hit = brass([48, 55, 60, 64, 67], 1.4, 0.4, 0.02); place(buf, st(hit), 0.7); place(buf, kick(0.8), 0.7)
    i = int(0.7 * SR); wet[i:i + len(hit)] += hit[:len(wet) - i]
    buf = finish(buf, wet)
    return tape_stop(buf, 2.2, 1.2)


def stg_maxwin():
    d = 5.5; buf = oneshot(d); wet = np.zeros(buf.shape[1])
    n = int(1.6 * SR); place(buf, st(sweep_bp(noise(n), 200, 9000, 0.5) * np.linspace(0, 1, n) ** 2 * 0.3), 0)
    for k, m in enumerate([60, 64, 67, 72, 76, 79, 84, 88]):
        p = pluck(m, 0.3, 0.08, 6000, 'saw'); place(buf, st(p, (-1) ** k * 0.5), k * 0.19)
        i = int(k * 0.19 * SR); wet[i:i + len(p)] += p[:len(wet) - i]
    for at, ch, dd in [(1.6, [48, 55, 60, 64, 67, 72], 0.5), (2.2, [50, 57, 62, 65, 69, 74], 0.5), (2.8, [52, 59, 64, 67, 71, 76], 2.2)]:
        hit = brass(ch, dd, 0.4, 0.01); place(buf, st(hit), at); place(buf, kick(0.9), at)
        i = int(at * SR); wet[i:i + len(hit)] += hit[:len(wet) - i]
    place(buf, st(crash(0.35, 2.6)), 2.8)
    for k in range(6): place(buf, st(bell(88 + [0, 4, 7][k % 3], 0.8, 0.07), (-1) ** k * 0.6), 2.9 + k * 0.12)
    return finish(buf, wet, 1.4)


def bw_tier():
    d = 1.6; buf = oneshot(d); wet = np.zeros(buf.shape[1])
    hit = brass([60, 64, 67, 72], 0.5, 0.42, 0.005); place(buf, st(hit), 0); place(buf, kick(0.9), 0); place(buf, st(crash(0.25, 1.4)), 0)
    wet[:len(hit)] += hit
    for k, m in enumerate([84, 88, 91]): place(buf, st(bell(m, 0.6, 0.08), (-1) ** k * 0.5), 0.05 + k * 0.07)
    return finish(buf, wet)


def bw_end():
    d = 1.8; buf = oneshot(d); wet = np.zeros(buf.shape[1])
    for k, m in enumerate([72, 76, 79, 84]):
        p = bell(m, 1.2, 0.16); place(buf, st(p, (-1) ** k * 0.3), k * 0.06); i = int(k * 0.06 * SR); wet[i:i + len(p)] += p[:len(wet) - i]
    hit = brass([48, 60, 64, 67, 72], 0.9, 0.3, 0.01); place(buf, st(hit), 0.25); place(buf, kick(0.7), 0.25)
    return finish(buf, wet)


# ---------- sfx (mono) ----------
def m_out(x, d=None, peak=0.85):
    if d: x = np.concatenate([x, np.zeros(max(0, int(d * SR) - len(x)))])[:int(d * SR)]
    fade = min(len(x) // 4, int(0.01 * SR)); x[-fade:] *= np.linspace(1, 0, fade)
    return x


def mix(d, *parts):
    y = np.zeros(int(d * SR))
    for at, x in parts:
        i = int(at * SR); e = min(len(y), i + len(x)); y[i:e] += x[:e - i]
    return y


def sfx_ui_click(): return mix(0.08, (0, click(2600, 0.6)), (0.004, thud(220, 0.04, 0.25)))
def sfx_ui_toggle(): return mix(0.16, (0, click(2200, 0.5)), (0.07, click(3000, 0.45)))


def sfx_ui_open():
    n = int(0.28 * SR); w = sweep_bp(noise(n), 600, 3500, 0.8) * np.sin(np.linspace(0, np.pi, n)) * 0.5
    return mix(0.3, (0, w), (0.2, click(2000, 0.3)))


def sfx_splash_play():
    n = int(1.0 * SR); t = np.arange(n) / SR
    motor = (saw(55 + 45 * (1 - np.exp(-t * 4)), n) * 0.25 + bp(noise(n), 300, 1500) * 0.15) * np.clip(t / 0.3, 0, 1) * np.exp(-np.maximum(0, t - 0.6) * 6)
    return mix(1.3, (0, thud(80, 0.2, 0.7)), (0.02, click(1500, 0.5)), (0.12, click(900, 0.6)), (0.18, thud(60, 0.15, 0.5)), (0.25, lp(motor, 1800)))


def sfx_spin_start():
    n = int(0.3 * SR); t = np.arange(n) / SR
    whirr = lp(saw(70 + 120 * t / 0.3, n) * 0.25 + bp(noise(n), 400, 2500) * 0.2, 2200) * np.sin(np.linspace(0, np.pi, n))
    return mix(0.38, (0, click(1800, 0.55)), (0.01, thud(110, 0.08, 0.55)), (0.06, whirr))


def sfx_reel_loop():
    L = 0.96; n = int(L * SR); t = np.arange(n) / SR  # periodic: 12 ticks, motor at multiples of 1/L
    f0 = round(96 * L) / L
    y = saw(f0 * (1 + 0.01 * np.sin(2 * np.pi * t / L * 6)), n) * 0.12 + lp(noise(n), 900) * 0.18
    y = lp(y, 1400)
    for k in range(12):
        i = int(k * L / 12 * SR); c = click(3200, 0.12); y[i:i + len(c)] += c[:n - i]
    return y, L


def sfx_reel_stop(): return mix(0.18, (0, thud(95, 0.14, 0.85)), (0, click(1400, 0.35)))


def sfx_reel_stop_s():
    y = mix(0.7, (0, bell(84, 0.7, 0.45)), (0, bell(91, 0.5, 0.2)))
    jingle = np.zeros(int(0.7 * SR))
    for k in range(5):
        c = bp(noise(int(0.05 * SR)), 5000, 11000) * perc(int(0.05 * SR), 0.03) * 0.25; i = int((0.02 + k * 0.045) * SR); jingle[i:i + len(c)] += c
    return mix(0.75, (0, thud(100, 0.1, 0.5)), (0, y), (0, jingle))


def sfx_antic_loop():
    L = 2.0; n = int(L * SR); t = np.arange(n) / SR
    tr = bp(noise(n), 1500, 8000) * (0.15 + 0.1 * np.sin(2 * np.pi * t * 4)) ** 2 * 1.5  # tracking hiss bursts (periodic)
    hum = sine(round(60 * L) / L, n) * 0.12 + sine(round(120 * L) / L, n) * 0.06
    sh = sum(sine(round(mtof(m) * L) / L, n) for m in (76, 81, 83)) * 0.05 * (0.6 + 0.4 * np.sin(2 * np.pi * t * 2))
    return tr + hum + sh, L


def sfx_win_s():
    return mix(0.7, (0, bell(76, 0.5, 0.35)), (0.09, bell(81, 0.55, 0.35)))


def sfx_win_m():
    return mix(1.1, *[(k * 0.075, bell(m, 0.6, 0.3)) for k, m in enumerate([72, 76, 79, 84])], (0.3, bell(88, 0.8, 0.22)))


def sfx_line_tick(): return mix(0.14, (0, bell(84, 0.12, 0.35)), (0, click(4000, 0.15)))


def sfx_count_loop():
    L = 0.4; n = int(L * SR); y = np.zeros(n)
    for k in range(8):
        i = int(k * L / 8 * SR); c = click(2800 if k % 2 else 3400, 0.4); y[i:i + len(c)] += c[:n - i]
    return y, L


def sfx_pause():
    n = int(0.5 * SR); t = np.arange(n) / SR
    buzz = lp(square(60, n) * 0.2 + bp(noise(n), 2000, 6000) * 0.1, 3000) * np.exp(-t * 5)
    return mix(0.6, (0, thud(70, 0.16, 0.85)), (0, click(1200, 0.6)), (0.04, buzz))


def sfx_rec_beep():
    b = lambda: sine(1000, int(0.09 * SR)) * env(int(0.09 * SR), 0.003, 1, 1, 0.01) * 0.4
    return mix(0.35, (0, b()), (0.16, b()))


def sfx_rewind():
    d = 1.8; n = int(d * SR); t = np.arange(n) / SR
    f = 900 + 2600 * np.clip(t / 0.4, 0, 1)
    sq = (saw(f, n) * 0.12 + saw(f * 1.5, n) * 0.06) * (1 + 0.3 * np.sin(2 * np.pi * 23 * t))
    sq = bp(sq, 600, 7000) + bp(noise(n), 2500, 9000) * 0.18
    e = np.clip(t / 0.08, 0, 1) * np.clip((d - t) / 0.25, 0, 1)
    return mix(1.9, (0, click(1500, 0.5)), (0.02, sq * e), (1.72, thud(90, 0.12, 0.5)))


def sfx_rew_mult():
    return mix(0.8, *[(k * 0.06, pluck(m, 0.2, 0.3, 6000, 'saw')) for k, m in enumerate([69, 72, 76, 81, 84])], (0.3, bell(88, 0.5, 0.25)))


def sfx_second_take():
    return mix(0.35, (0, click(3500, 0.9)), (0, thud(300, 0.05, 0.6)), (0.003, bp(noise(int(0.06 * SR)), 1500, 6000) * perc(int(0.06 * SR), 0.03) * 0.6))


def sfx_retrigger():
    return mix(1.0, *[(k * 0.1, bell(m, 0.5, 0.3)) for k, m in enumerate([79, 84, 88])], (0.3, pluck(91, 0.4, 0.15, 7000)))


def sfx_trigger():
    parts = [(k * 0.11, bell(m, 0.7, 0.3)) for k, m in enumerate([69, 72, 76, 81])]
    return mix(1.6, (0, thud(80, 0.2, 0.6)), *parts, (0.45, bell(84, 1.1, 0.3)), (0.45, bell(88, 1.1, 0.2)))


def sfx_nofunds():
    b = lambda: lp(square(110, int(0.13 * SR)), 1200) * env(int(0.13 * SR), 0.005, 1, 1, 0.02) * 0.4
    return mix(0.4, (0, b()), (0.18, b()))


def sfx_error():
    n = int(0.8 * SR); t = np.arange(n) / SR
    return bp(noise(n), 800, 9000) * 0.55 * np.clip(t / 0.02, 0, 1) * np.exp(-t * 3) * (1 + 0.5 * np.sign(np.sin(2 * np.pi * 9 * t)))


# ---------- catalogue ----------
# name: (fn, kind, volume, loop?) — kind music|stinger|sfx; volume is the runtime gain
CAT = {
    'mus_base': (mus_base, 'music', 0.55), 'mus_bonus': (mus_bonus, 'music', 0.55), 'mus_bigwin': (mus_bigwin, 'music', 0.6),
    'stg_bonus_intro': (stg_bonus_intro, 'stinger', 0.8), 'stg_shift_over': (stg_shift_over, 'stinger', 0.8), 'stg_maxwin': (stg_maxwin, 'stinger', 0.85),
    'bw_tier': (bw_tier, 'stinger', 0.7), 'bw_end': (bw_end, 'stinger', 0.7),
    'ui_click': (sfx_ui_click, 'sfx', 0.5), 'ui_toggle': (sfx_ui_toggle, 'sfx', 0.5), 'ui_open': (sfx_ui_open, 'sfx', 0.45),
    'splash_play': (sfx_splash_play, 'sfx', 0.7), 'spin_start': (sfx_spin_start, 'sfx', 0.5), 'reel_loop': (sfx_reel_loop, 'sfx', 0.28),
    'reel_stop': (sfx_reel_stop, 'sfx', 0.55), 'reel_stop_s': (sfx_reel_stop_s, 'sfx', 0.7), 'antic_loop': (sfx_antic_loop, 'sfx', 0.5),
    'win_s': (sfx_win_s, 'sfx', 0.55), 'win_m': (sfx_win_m, 'sfx', 0.6), 'line_tick': (sfx_line_tick, 'sfx', 0.4),
    'count_loop': (sfx_count_loop, 'sfx', 0.35), 'pause': (sfx_pause, 'sfx', 0.7), 'rec_beep': (sfx_rec_beep, 'sfx', 0.3),
    'rewind': (sfx_rewind, 'sfx', 0.6), 'rew_mult': (sfx_rew_mult, 'sfx', 0.6), 'second_take': (sfx_second_take, 'sfx', 0.65),
    'retrigger': (sfx_retrigger, 'sfx', 0.6), 'trigger': (sfx_trigger, 'sfx', 0.7), 'nofunds': (sfx_nofunds, 'sfx', 0.3), 'error': (sfx_error, 'sfx', 0.45),
}


def write(out, name, y, stereo, loop=None, wav=False):
    tail = int(1.0 * SR)
    if loop is not None:  # loop + 1 s of its own start, so the player can loop inside decoded content
        y = np.concatenate([y, y[..., :tail] if y.shape[-1] >= tail else np.tile(y, (1,) * (y.ndim - 1) + (tail // y.shape[-1] + 1,))[..., :tail]], axis=-1)
    y = master(y, 1.1 if stereo else 1.0, 13000 if stereo else 16000)
    pcm = (np.clip(y.T if stereo else y, -1, 1) * 32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.raw', delete=False) as f: f.write(pcm.tobytes()); raw = f.name
    ch = '2' if stereo else '1'; br = '128k' if stereo else '96k'
    path = os.path.join(out, name + ('.wav' if wav else '.mp3'))
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', ch, '-i', raw]
    cmd += [] if wav else ['-c:a', 'libmp3lame', '-b:a', br]
    subprocess.run(cmd + [path], check=True); os.unlink(raw)
    return path


def main():
    out = sys.argv[1]; wav = '--wav' in sys.argv; os.makedirs(out, exist_ok=True)
    only = [a for a in sys.argv[2:] if not a.startswith('--')]
    man_p = os.path.join(out, 'audio.json')
    man = json.load(open(man_p)) if os.path.exists(man_p) else {}
    for name, (fn, kind, vol) in CAT.items():
        if only and name not in only: continue
        r = fn(); loop = None
        if isinstance(r, tuple): r, loop = r
        stereo = r.ndim == 2
        p = write(out, name, r, stereo, loop, wav)
        dur = r.shape[-1] / SR
        man[name] = {'kind': kind, 'vol': vol, 'dur': round(dur, 3), **({'loop': round(loop, 6)} if loop else {})}
        print(f'{name:16s} {kind:8s} {dur:6.2f}s {"loop" if loop else "    "} {os.path.getsize(p) / 1024:6.1f} KB')
    json.dump({k: man[k] for k in CAT if k in man}, open(man_p, 'w'), indent=1)


if __name__ == '__main__':
    main()

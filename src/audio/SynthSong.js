const TAU = Math.PI * 2;

const midiToFrequency = (midi) => 440 * (2 ** ((midi - 69) / 12));

function panGains(pan) {
  const clamped = Math.max(-1, Math.min(1, pan));
  return {
    left: Math.sqrt((1 - clamped) / 2),
    right: Math.sqrt((1 + clamped) / 2),
  };
}

function addPluck(channels, sampleRate, start, duration, frequency, amplitude, pan = 0) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(channels.left.length, Math.ceil((start + duration) * sampleRate));
  const gains = panGains(pan);

  for (let index = startIndex; index < endIndex; index += 1) {
    const t = index / sampleRate - start;
    const attack = Math.min(1, t / 0.008);
    const release = Math.min(1, (duration - t) / 0.035);
    const envelope = attack * Math.max(0, release) * Math.exp(-4.8 * t);
    const bell = Math.sin(TAU * frequency * t)
      + 0.38 * Math.sin(TAU * frequency * 2.01 * t)
      + 0.16 * Math.sin(TAU * frequency * 3.97 * t);
    const value = amplitude * envelope * bell;
    channels.left[index] += value * gains.left;
    channels.right[index] += value * gains.right;
  }
}

function addBass(channels, sampleRate, start, duration, frequency, amplitude) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(channels.left.length, Math.ceil((start + duration) * sampleRate));

  for (let index = startIndex; index < endIndex; index += 1) {
    const t = index / sampleRate - start;
    const attack = Math.min(1, t / 0.012);
    const release = Math.min(1, (duration - t) / 0.05);
    const envelope = attack * Math.max(0, release) * Math.exp(-1.7 * t);
    const value = amplitude * envelope
      * (Math.sin(TAU * frequency * t) + 0.24 * Math.sin(TAU * frequency * 2 * t));
    channels.left[index] += value * 0.68;
    channels.right[index] += value * 0.68;
  }
}

function addPad(channels, sampleRate, start, duration, frequencies, amplitude) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(channels.left.length, Math.ceil((start + duration) * sampleRate));

  for (let index = startIndex; index < endIndex; index += 1) {
    const t = index / sampleRate - start;
    const attack = Math.min(1, t / 0.32);
    const release = Math.min(1, (duration - t) / 0.45);
    const envelope = Math.max(0, attack * release);
    let leftValue = 0;
    let rightValue = 0;
    frequencies.forEach((frequency, voice) => {
      const detune = 1 + (voice - 1) * 0.0016;
      leftValue += Math.sin(TAU * frequency * detune * t + voice * 0.7);
      rightValue += Math.sin(TAU * frequency / detune * t + voice * 1.1);
    });
    channels.left[index] += leftValue * amplitude * envelope / frequencies.length;
    channels.right[index] += rightValue * amplitude * envelope / frequencies.length;
  }
}

function addKick(channels, sampleRate, start, amplitude) {
  const duration = 0.28;
  const startIndex = Math.floor(start * sampleRate);
  const endIndex = Math.min(channels.left.length, Math.ceil((start + duration) * sampleRate));
  let phase = 0;

  for (let index = Math.max(0, startIndex); index < endIndex; index += 1) {
    const t = index / sampleRate - start;
    const frequency = 48 + 115 * Math.exp(-24 * t);
    phase += TAU * frequency / sampleRate;
    const value = Math.sin(phase) * amplitude * Math.exp(-13 * t);
    channels.left[index] += value * 0.72;
    channels.right[index] += value * 0.72;
  }
}

function addNoiseHit(channels, sampleRate, start, duration, amplitude, seed, pan = 0) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(channels.left.length, Math.ceil((start + duration) * sampleRate));
  const gains = panGains(pan);
  let randomState = seed >>> 0;
  let previous = 0;

  for (let index = startIndex; index < endIndex; index += 1) {
    const t = index / sampleRate - start;
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    const noise = randomState / 0xffffffff * 2 - 1;
    const highPassed = noise - previous * 0.72;
    previous = noise;
    const value = highPassed * amplitude * Math.exp(-22 * t);
    channels.left[index] += value * gains.left;
    channels.right[index] += value * gains.right;
  }
}

function normalize(channels, ceiling = 0.92) {
  let peak = 0;
  for (let index = 0; index < channels.left.length; index += 1) {
    peak = Math.max(peak, Math.abs(channels.left[index]), Math.abs(channels.right[index]));
  }
  if (peak <= ceiling || peak === 0) return;
  const scale = ceiling / peak;
  for (let index = 0; index < channels.left.length; index += 1) {
    channels.left[index] *= scale;
    channels.right[index] *= scale;
  }
}

export function renderMoonlitSamples({ sampleRate = 44100, duration = 60, bpm = 128 } = {}) {
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const channels = {
    left: new Float32Array(length),
    right: new Float32Array(length),
  };
  const beatDuration = 60 / bpm;
  const totalBeats = Math.ceil(duration / beatDuration);
  const progression = [
    [50, 53, 57], // D minor
    [46, 50, 53], // B-flat major
    [41, 45, 48], // F major
    [48, 52, 55], // C major
  ];
  const melody = [0, 3, 7, 10, 7, 3, 5, 7, 12, 10, 7, 5, 3, 5, 7, 3];
  const arpeggioOrder = [0, 1, 2, 1, 2, 1, 0, 2];

  for (let barBeat = 0; barBeat < totalBeats; barBeat += 4) {
    const chord = progression[Math.floor(barBeat / 4) % progression.length];
    addPad(
      channels,
      sampleRate,
      barBeat * beatDuration,
      beatDuration * 4.35,
      chord.map((midi) => midiToFrequency(midi)),
      0.1,
    );
  }

  for (let beat = 0; beat < totalBeats; beat += 1) {
    const time = beat * beatDuration;
    const chord = progression[Math.floor(beat / 4) % progression.length];
    addBass(channels, sampleRate, time, beatDuration * 0.82, midiToFrequency(chord[0] - 12), 0.25);
    if (beat % 4 === 0 || beat % 4 === 2) addKick(channels, sampleRate, time, 0.55);
    if (beat % 4 === 1 || beat % 4 === 3) {
      addNoiseHit(channels, sampleRate, time, 0.2, 0.22, 1907 + beat, 0.08);
    }
  }

  for (let halfBeat = 0; halfBeat < totalBeats * 2; halfBeat += 1) {
    const beat = halfBeat / 2;
    const time = beat * beatDuration;
    const chord = progression[Math.floor(beat / 4) % progression.length];
    const chordMidi = chord[arpeggioOrder[halfBeat % arpeggioOrder.length]] + 12;
    addNoiseHit(channels, sampleRate, time, 0.075, halfBeat % 2 ? 0.085 : 0.055, 991 + halfBeat, halfBeat % 2 ? 0.35 : -0.35);
    addPluck(channels, sampleRate, time, beatDuration * 0.7, midiToFrequency(chordMidi), 0.12, halfBeat % 2 ? 0.28 : -0.28);

    if (beat >= 8 && halfBeat % 2 === 0) {
      const sectionBoost = beat >= 40 && beat < 88 ? 1.18 : 0.92;
      const melodyMidi = 62 + melody[Math.floor(beat - 8) % melody.length];
      addPluck(channels, sampleRate, time, beatDuration * 0.9, midiToFrequency(melodyMidi), 0.16 * sectionBoost, Math.sin(beat * 0.6) * 0.22);
    }
  }

  normalize(channels);
  return { ...channels, sampleRate, duration, bpm };
}

export function createMoonlitBuffer(audioContext, options = {}) {
  const rendered = renderMoonlitSamples({
    sampleRate: audioContext.sampleRate,
    ...options,
  });
  const buffer = audioContext.createBuffer(2, rendered.left.length, rendered.sampleRate);
  buffer.copyToChannel(rendered.left, 0);
  buffer.copyToChannel(rendered.right, 1);
  return buffer;
}

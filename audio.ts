// A global AudioContext instance
let audioContext: AudioContext | null = null;
// Muted state, managed within this module. Starts muted.
let isMuted = true;

// Initializes the AudioContext. Must be called after a user interaction.
const initAudioContext = () => {
    if (audioContext) return;
    try {
        // Use the standard AudioContext or the webkit prefix for older browsers.
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
        console.error("Web Audio API is not supported in this browser");
    }
};

// Toggles the mute state and returns the new state.
export const toggleMute = (): boolean => {
    // Initialize context on first user interaction if it hasn't been already.
    initAudioContext();
    isMuted = !isMuted;
    
    // If we are unmuting and the context is suspended, resume it.
    if (!isMuted && audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return isMuted;
};

// Generic function to play a tone.
const playTone = (freq: number, duration: number, type: OscillatorType, volume: number, sweepTo?: number) => {
    if (isMuted || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Fade in slightly to avoid clicking
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    if (sweepTo) {
        // Creates a sweeping pitch effect
        oscillator.frequency.exponentialRampToValueAtTime(sweepTo, audioContext.currentTime + duration);
    }

    // Fade out to avoid clicking
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
};

// Generic function to play white noise with a filter for effects like whooshes or explosions.
const playNoise = (duration: number, volume: number, filterType: BiquadFilterType, filterFreq: number, filterSweepTo?: number) => {
    if (isMuted || !audioContext) return;

    // Create a buffer of random noise
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // Generate random values between -1 and 1
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, audioContext.currentTime);
    if (filterSweepTo) {
        // Sweep the filter frequency for a "whoosh" effect
        filter.frequency.exponentialRampToValueAtTime(filterSweepTo, audioContext.currentTime + duration * 0.8);
    }

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start();
    noise.stop(audioContext.currentTime + duration);
};

// --- Exported Sound Effects ---

export const playClick = () => {
    initAudioContext();
    playTone(880, 0.05, 'triangle', 0.2);
};

export const playConfirm = () => {
    initAudioContext();
    playTone(440, 0.1, 'sine', 0.4, 660);
};

export const playLaunch = () => {
    initAudioContext();
    playNoise(1.5, 0.2, 'bandpass', 100, 4000);
};

export const playTankFire = () => {
    initAudioContext();
    // A sharp, low-pitched sound
    playTone(150, 0.2, 'sawtooth', 0.5, 100);
    playNoise(0.2, 0.3, 'bandpass', 200, 500);
};

export const playHit = () => {
    initAudioContext();
    // Low frequency boom
    playTone(100, 0.5, 'triangle', 0.7, 30);
    // High frequency crackle
    playNoise(0.4, 0.5, 'highpass', 1000);
};

export const playMiss = () => {
    initAudioContext();
    // A quick whoosh and a dull thud
    playTone(300, 0.3, 'sawtooth', 0.3, 80);
};

export const playNewRound = () => {
    initAudioContext();
    playTone(523.25, 0.1, 'sine', 0.4); // C5
    setTimeout(() => playTone(659.25, 0.1, 'sine', 0.4), 120); // E5
};
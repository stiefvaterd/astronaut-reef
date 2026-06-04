import React, { useState, useEffect, useRef } from 'react';

// ── Space travel scene data (created once at module level) ──────────────
const STARS = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  top:      (i * 17.3 + 11.7) % 100,
  size:     i % 4 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
  length:   i % 4 === 0 ? 22 : i % 3 === 0 ? 14 : 7,
  duration: 0.7 + (i % 7) * 0.22,
  delay:    -((i * 0.41) % 3.5),
  color:    i % 6 === 0 ? '#FFE680' : i % 8 === 0 ? '#80C8FF' : '#FFFFFF',
  opacity:  0.45 + (i % 4) * 0.15,
}));

const PLANETS = [
  { emoji: '🪐', top: 14, size: 58, duration: 15, delay: 0   },
  { emoji: '🔴', top: 70, size: 50, duration: 10, delay: 3   },
  { emoji: '🌕', top: 38, size: 54, duration: 17, delay: 7   },
  { emoji: '🌍', top: 82, size: 52, duration: 12, delay: 1   },
  { emoji: '⭐', top: 26, size: 40, duration: 8,  delay: 5   },
  { emoji: '☄️', top: 56, size: 46, duration: 9,  delay: 11  },
  { emoji: '🌟', top:  8, size: 38, duration: 11, delay: 4   },
  { emoji: '💫', top: 90, size: 42, duration: 13, delay: 8   },
];

const ALIENS = [
  { emoji: '👽', top: 30, size: 46, duration: 9,  delay: 2  },
  { emoji: '🛸', top: 62, size: 52, duration: 7,  delay: 5  },
  { emoji: '👾', top: 76, size: 44, duration: 11, delay: 1  },
  { emoji: '🤖', top: 18, size: 46, duration: 8,  delay: 8  },
  { emoji: '🛸', top: 47, size: 50, duration: 10, delay: 4  },
  { emoji: '👽', top: 86, size: 42, duration: 6,  delay: 12 },
];

// ── Round SVG fuel gauge ────────────────────────────────────────────────
const FuelGauge = ({ value }) => {
  const r = 70, cx = 100, cy = 108;
  const circ = 2 * Math.PI * r;
  const arcLen = (240 / 360) * circ;          // 240-degree sweep
  const fillLen = (Math.max(0, Math.min(100, value)) / 100) * arcLen;
  const color = value > 60 ? '#00FF41' : value > 30 ? '#FFD700' : '#FF4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 200 200" style={{ width: '140px', height: '140px' }}>
        {/* Outer glow ring */}
        <circle cx={cx} cy={cy} r={r + 10} fill="none"
          stroke={color} strokeWidth="1" opacity="0.2" />
        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,255,255,0.1)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`}
          transform={`rotate(150 ${cx} ${cy})`} />
        {/* Fuel fill */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${fillLen} ${circ}`}
          transform={`rotate(150 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 7px ${color})`, transition: 'stroke-dasharray 0.4s ease-out, stroke 0.4s' }} />
        {/* Value */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color}
          fontSize="30" fontWeight="bold" fontFamily="'Courier New', monospace">
          {Math.round(value)}
        </text>
        {/* Label */}
        <text x={cx} y={cy + 20} textAnchor="middle" fill="rgba(200,200,255,0.75)"
          fontSize="13" fontFamily="'Courier New', monospace">FUEL %</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        width: '118px', marginTop: '-14px' }}>
        <span style={{ color: '#FF4444', fontSize: '12px', fontFamily: 'Courier New' }}>E</span>
        <span style={{ color: '#00FF41', fontSize: '12px', fontFamily: 'Courier New' }}>F</span>
      </div>
    </div>
  );
};

const SpaceshipSimulator = () => {
  const [fuel, setFuel] = useState(75);
  const [speed, setSpeed] = useState(0);
  const [oxygen, setOxygen] = useState(100);
  const [temperature, setTemperature] = useState(50);
  const [shield, setShield] = useState(80);
  const [isShaking, setIsShaking] = useState(false);
  const [launchPhase, setLaunchPhase] = useState('idle');
  const [checks, setChecks] = useState([]);
  const [countdownText, setCountdownText] = useState('');
  const [reverseThrusterOn, setReverseThrusterOn] = useState(false);
  const [rocketY, setRocketY] = useState(50);
  const [lasers, setLasers] = useState([]);
  const audioContextRef = useRef(null);
  const rumbleRef = useRef(null);
  const timeoutsRef = useRef([]);
  const reverseRumbleRef = useRef(null);
  const reverseShakeRef = useRef(null);
  const rocketMoveRef = useRef(null);
  const spaceHumRef = useRef(null);
  const laserIdRef = useRef(0);

  // Initialize audio context
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, []);

  // Play sound effect
  const playSound = (frequency = 800, duration = 0.1, type = 'sine') => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  // Spoken voice (uses the browser's built-in speech synthesis)
  const speak = (text, cancelFirst = true) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.15;
    utter.volume = 1;
    if (cancelFirst) window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  // Rumbling rocket sound (deep brown-noise rumble + low bass tone)
  const startRumble = (duration = 6) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // ----- Brown noise rumble -----
    const bufferSize = Math.floor(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    // Lowpass filter makes it a deep rumble rather than hiss
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.6, now + 0.6); // ramp up
    noiseGain.gain.setValueAtTime(0.6, now + duration - 0.8);
    noiseGain.gain.linearRampToValueAtTime(0, now + duration); // fade out

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    // ----- Low bass tone for extra power -----
    const bass = audioContext.createOscillator();
    bass.type = 'sawtooth';
    bass.frequency.value = 45;

    const bassGain = audioContext.createGain();
    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.25, now + 0.6);
    bassGain.gain.setValueAtTime(0.25, now + duration - 0.8);
    bassGain.gain.linearRampToValueAtTime(0, now + duration);

    bass.connect(bassGain);
    bassGain.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + duration);
    bass.start(now);
    bass.stop(now + duration);

    rumbleRef.current = { noise, bass };
  };

  // Looping rumble for reverse thruster (runs until explicitly stopped)
  const startLoopingRumble = (ref) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    const now = audioContext.currentTime;

    // Short brown-noise buffer that loops
    const bufferSize = Math.floor(audioContext.sampleRate * 2);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true; // loops forever until stopped

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.45, now + 0.35);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    const bass = audioContext.createOscillator();
    bass.type = 'sawtooth';
    bass.frequency.value = 40;

    const bassGain = audioContext.createGain();
    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.18, now + 0.35);

    bass.connect(bassGain);
    bassGain.connect(audioContext.destination);

    noise.start(now);
    bass.start(now);

    ref.current = { noise, bass, noiseGain, bassGain };
  };

  const stopLoopingRumble = (ref) => {
    if (!ref.current) return;
    const { noise, bass, noiseGain, bassGain } = ref.current;
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    const now = audioContext.currentTime;
    noiseGain.gain.setValueAtTime(noiseGain.gain.value, now);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.3);
    bassGain.gain.setValueAtTime(bassGain.gain.value, now);
    bassGain.gain.linearRampToValueAtTime(0, now + 0.3);
    setTimeout(() => {
      try { noise.stop(); } catch (e) {}
      try { bass.stop(); } catch (e) {}
    }, 350);
    ref.current = null;
  };
  const addTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      if (reverseShakeRef.current) clearInterval(reverseShakeRef.current);
      if (rocketMoveRef.current)   clearInterval(rocketMoveRef.current);
      stopLoopingRumble(reverseRumbleRef);
      stopSpaceHum();
    };
  }, []);

  // ── Rocket hum (space travel screen) ─────────────────────────────────
  const startSpaceHum = () => {
    const audioContext = audioContextRef.current;
    if (!audioContext || spaceHumRef.current) return;
    const now = audioContext.currentTime;

    // Heavy sawtooth engine drone — sounds like rocket engines
    const osc1 = audioContext.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 58;

    // Second harmonic for depth
    const osc2 = audioContext.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 116;

    // Third layer — higher hum for "engine room" feel
    const osc3 = audioContext.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = 232;

    // Slow LFO (0.18 Hz) gives a living, breathing throb
    const lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.18;
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = 9;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const g1 = audioContext.createGain(); g1.gain.value = 0.08;
    const g2 = audioContext.createGain(); g2.gain.value = 0.035;
    const g3 = audioContext.createGain(); g3.gain.value = 0.015;

    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(1, now + 2.5);

    osc1.connect(g1); g1.connect(masterGain);
    osc2.connect(g2); g2.connect(masterGain);
    osc3.connect(g3); g3.connect(masterGain);
    masterGain.connect(audioContext.destination);

    lfo.start(now); osc1.start(now); osc2.start(now); osc3.start(now);
    spaceHumRef.current = { osc1, osc2, osc3, lfo, masterGain };
  };

  const stopSpaceHum = () => {
    if (!spaceHumRef.current) return;
    const { osc1, osc2, osc3, lfo, masterGain } = spaceHumRef.current;
    const audioContext = audioContextRef.current;
    if (!audioContext) { spaceHumRef.current = null; return; }
    const now = audioContext.currentTime;
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 1.5);
    setTimeout(() => {
      try { osc1.stop(); osc2.stop(); osc3.stop(); lfo.stop(); } catch (e) {}
    }, 1600);
    spaceHumRef.current = null;
  };

  // ── Boost ─────────────────────────────────────────────────────────────
  const playBoostSound = () => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    const now = audioContext.currentTime;
    // Rising whoosh — two oscillators for a rich chord
    const osc1 = audioContext.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.linearRampToValueAtTime(920, now + 0.45);
    const osc2 = audioContext.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(240, now);
    osc2.frequency.linearRampToValueAtTime(1380, now + 0.45);
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    osc1.connect(gain); osc2.connect(gain);
    gain.connect(audioContext.destination);
    osc1.start(now); osc1.stop(now + 0.55);
    osc2.start(now); osc2.stop(now + 0.55);
  };

  const handleBoost = () => {
    playBoostSound();
    speak('Boost mode activated!');
    setSpeed(prev => Math.min(prev + 45, 100));
    setFuel(prev => Math.max(prev - 12, 0));
    // Rapid shake burst
    [0, 80, 160, 240, 320].forEach(delay => addTimeout(triggerShake, delay));
  };

  // Start / stop rocket hum when entering or leaving the space screen
  useEffect(() => {
    if (launchPhase === 'launched') {
      startSpaceHum();
    } else {
      stopSpaceHum();
      setLasers([]);
    }
  }, [launchPhase]);

  // ── Laser blaster ─────────────────────────────────────────────────────
  const playLaserSound = () => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.28);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  };

  const handleLaser = () => {
    playLaserSound();
    const id = laserIdRef.current++;
    setLasers(prev => [...prev, { id, y: rocketY }]);
    setTimeout(() => setLasers(prev => prev.filter(l => l.id !== id)), 550);
  };

  // Screen shake effect
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);
  };

  // Continuous shake during launch
  const startContinuousShake = (duration) => {
    let elapsed = 0;
    const interval = 100;
    const shakeLoop = () => {
      if (elapsed >= duration) {
        setIsShaking(false);
        return;
      }
      setIsShaking(prev => !prev);
      elapsed += interval;
      addTimeout(shakeLoop, interval);
    };
    shakeLoop();
  };

  // Button handlers
  const handleAccelerate = () => {
    playSound(1200, 0.15);
    setSpeed(prev => Math.min(prev + 15, 100));
    setFuel(prev => Math.max(prev - 8, 0));
    triggerShake();
  };

  const handleDecelerate = () => {
    playSound(600, 0.15);
    setSpeed(prev => Math.max(prev - 15, 0));
  };

  const handleTurnLeft = () => {
    playSound(900, 0.1);
    setTemperature(prev => Math.max(prev - 5, 20));
  };

  const handleTurnRight = () => {
    playSound(950, 0.1);
    setTemperature(prev => Math.max(prev - 5, 20));
  };

  const handleShields = () => {
    playSound(1500, 0.2);
    speak('Shields up!');
    setShield(prev => Math.min(prev + 20, 100));
    setFuel(prev => Math.max(prev - 10, 0));
    triggerShake();
  };

  const handleLanding = () => {
    // Don't interrupt an active sequence
    if (['checking', 'countdown', 'landing'].includes(launchPhase)) return;
    clearAllTimeouts();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setLaunchPhase('landing');
    setCountdownText('');
    setChecks([]);
    playSound(700, 0.3, 'sawtooth');
    speak('Starting landing sequence. Firing landing rockets!');

    // Fire the landing rockets: rumble + shake for the whole descent (~5.8s)
    startRumble(6.3);
    startContinuousShake(5800);

    // Countdown 5...4...3...2...1 as the ship descends
    const nums = ['5', '4', '3', '2', '1'];
    const words = ['Five', 'Four', 'Three', 'Two', 'One'];
    nums.forEach((num, i) => {
      addTimeout(() => {
        playSound(620 - i * 50, 0.25, 'square');
        speak(words[i]);
        setCountdownText(num);
      }, 800 + 1000 * i);
    });

    // Touchdown!
    addTimeout(() => {
      playSound(240, 0.9, 'sawtooth');
      setCountdownText('');
      setLaunchPhase('landed');
      setSpeed(0);
      speak(
        'Touchdown! Landing successful. Good job, Astronaut Reef! You are now on the planet Mars.'
      );
    }, 800 + 1000 * nums.length);
  };

  const handleReverseThruster = () => {
    if (!reverseThrusterOn) {
      // --- ENGAGE ---
      setReverseThrusterOn(true);
      playSound(850, 0.2, 'sawtooth');
      speak('Reverse thruster engaged!');
      startLoopingRumble(reverseRumbleRef);
      // Shake every 120ms until disengaged
      reverseShakeRef.current = setInterval(() => {
        setIsShaking(prev => !prev);
      }, 120);
    } else {
      // --- DISENGAGE ---
      setReverseThrusterOn(false);
      stopLoopingRumble(reverseRumbleRef);
      if (reverseShakeRef.current) {
        clearInterval(reverseShakeRef.current);
        reverseShakeRef.current = null;
      }
      setIsShaking(false);
      playSound(400, 0.2, 'sine');
      speak('Reverse thruster disengaged.');
    }
  };

  // ----- ROCKET UP / DOWN CONTROLS (space travel) -----
  const startMovingUp = () => {
    if (rocketMoveRef.current) clearInterval(rocketMoveRef.current);
    rocketMoveRef.current = setInterval(() => {
      setRocketY(prev => Math.max(5, prev - 1));
    }, 40);
  };

  const startMovingDown = () => {
    if (rocketMoveRef.current) clearInterval(rocketMoveRef.current);
    rocketMoveRef.current = setInterval(() => {
      setRocketY(prev => Math.min(88, prev + 1));
    }, 40);
  };

  const stopMovingRocket = () => {
    if (rocketMoveRef.current) {
      clearInterval(rocketMoveRef.current);
      rocketMoveRef.current = null;
    }
  };

  const handleReset = () => {
    playSound(400, 0.3);
    clearAllTimeouts();
    stopMovingRocket();
    setRocketY(50);
    // Stop reverse thruster if running
    if (reverseThrusterOn) {
      stopLoopingRumble(reverseRumbleRef);
      if (reverseShakeRef.current) {
        clearInterval(reverseShakeRef.current);
        reverseShakeRef.current = null;
      }
      setReverseThrusterOn(false);
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setFuel(75);
    setSpeed(0);
    setOxygen(100);
    setTemperature(50);
    setShield(80);
    setLaunchPhase('idle');
    setChecks([]);
    setCountdownText('');
    setIsShaking(false);
  };

  // ----- LAUNCH SEQUENCE -----
  const checkList = [
    { name: 'NAVIGATION SYSTEMS', speech: 'Navigation systems... OK!' },
    { name: 'FUEL PRESSURE',      speech: 'Fuel pressure... OK!' },
    { name: 'LIFE SUPPORT',       speech: 'Life support... OK!' },
    { name: 'ENGINE IGNITION',    speech: 'Engine ignition... OK!' },
    { name: 'GUIDANCE LOCKED',    speech: 'Guidance locked... OK!' },
  ];

  const handleLaunchInitiation = () => {
    if (launchPhase !== 'idle') return;
    playSound(700, 0.2);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speak('Starting pre-launch checks!');
    setLaunchPhase('checking');
    setChecks([]);

    // 1800ms between each check — gives every phrase time to finish
    // before the next one cancels-and-speaks (no unreliable queueing)
    const STEP = 1800;
    checkList.forEach(({ name, speech }, index) => {
      addTimeout(() => {
        playSound(1000 + index * 100, 0.12);
        speak(speech); // cancel any leftover, then speak — reliable on all browsers
        setChecks(prev => [...prev, { name, status: 'OK' }]);
      }, STEP * (index + 1));
    });

    const allDoneAt = STEP * checkList.length;

    // "All systems go!" fires 1800ms after the last check
    addTimeout(() => {
      playSound(1600, 0.4, 'square');
      speak('All systems go! Ready for launch!');
      setLaunchPhase('ready');
    }, allDoneAt + STEP);

    // "Astronaut, are you ready?" — 2500ms later
    addTimeout(() => {
      speak('Astronaut, are you ready?');
    }, allDoneAt + STEP + 2500);

    // "Ok hold on tight..." — 3000ms after that
    addTimeout(() => {
      speak('Ok, hold on tight and press the orange Launch button!');
    }, allDoneAt + STEP + 2500 + 3000);
  };

  const handleLaunch = () => {
    if (launchPhase !== 'ready') return;
    // Clear any pending "are you ready?" prompts and stop speech
    clearAllTimeouts();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setLaunchPhase('countdown');

    // Start the rumble for the whole countdown + blastoff (~5s)
    startRumble(5.5);
    startContinuousShake(5500);

    // 3... 2... 1...
    const numbers = ['3', '2', '1'];
    const words = ['Three', 'Two', 'One'];
    numbers.forEach((num, index) => {
      addTimeout(() => {
        playSound(500, 0.3, 'square');
        speak(words[index]);
        setCountdownText(num);
      }, 1000 * index);
    });

    // BLASTOFF!
    addTimeout(() => {
      playSound(300, 0.6, 'sawtooth');
      speak('Blast off!');
      setCountdownText('🚀 BLASTOFF! 🚀');
      setLaunchPhase('launched');
      setSpeed(100);
      setFuel(prev => Math.max(prev - 20, 0));
    }, 3000);
  };

  // Gauge component
  const Gauge = ({ value, max = 100, label, color }) => {
    const percentage = (value / max) * 100;
    return (
      <div style={styles.gauge}>
        <div style={styles.gaugeLabel}>{label}</div>
        <div style={styles.gaugeBackground}>
          <div
            style={{
              ...styles.gaugeFill,
              width: `${percentage}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <div style={styles.gaugeValue}>{Math.round(value)}</div>
      </div>
    );
  };

  // Get color based on value
  const getGaugeColor = (value, max = 100) => {
    const percent = value / max;
    if (percent > 0.6) return '#00FF41'; // Green
    if (percent > 0.3) return '#FFD700'; // Yellow
    return '#FF4444'; // Red
  };

  // Rocket breaks orbit and descends during the final two countdown beats
  const isDescending = launchPhase === 'landing' &&
    (countdownText === '2' || countdownText === '1');

  return (
    <div
      style={{
        ...styles.container,
        transform: isShaking ? 'translate(5px, 5px)' : 'translate(0, 0)',
        transition: 'transform 0.05s',
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.blinkingLight} />
        <h1 style={styles.title}>⚡ SPACESHIP CONTROL PANEL ⚡</h1>
        <div style={styles.blinkingLight} />
      </div>

      {/* Main display area */}
      <div style={styles.displayArea}>
        {/* Gauges */}
        <div style={styles.gaugesGrid}>
          <Gauge
            value={fuel}
            label="FUEL"
            color={getGaugeColor(fuel)}
          />
          <Gauge
            value={speed}
            label="SPEED"
            color={getGaugeColor(speed)}
          />
          <Gauge
            value={oxygen}
            label="OXYGEN"
            color={getGaugeColor(oxygen)}
          />
          <Gauge
            value={temperature}
            max={100}
            label="TEMP"
            color={getGaugeColor(temperature, 100)}
          />
          <Gauge
            value={shield}
            label="SHIELD"
            color={getGaugeColor(shield)}
          />
        </div>

        {/* Main display screen */}
        <div style={styles.mainScreen}>
          <div style={styles.screenContent}>
            {speed > 0 && launchPhase !== 'landing' && launchPhase !== 'landed' && (
              <div style={styles.warpEffect} />
            )}

            {/* Mars surface (shown during landing + after touchdown) */}
            {(launchPhase === 'landing' || launchPhase === 'landed') && (
              <div style={styles.marsGround}>
                <div style={styles.crater1} />
                <div style={styles.crater2} />
              </div>
            )}

            <div
              style={{
                ...styles.shipWrap,
                ...(launchPhase === 'launched' ? styles.shipLaunching : {}),
                ...(launchPhase === 'landing' ? styles.shipLanding : {}),
                ...(launchPhase === 'landed' ? styles.shipLanded : {}),
              }}
            >
              <div
                style={{
                  ...styles.spacecraftIcon,
                  ...(['countdown', 'launched', 'landing', 'landed'].includes(launchPhase)
                    ? styles.spacecraftUp
                    : {}),
                }}
              >
                🚀
              </div>
              {(launchPhase === 'countdown' ||
                launchPhase === 'launched' ||
                launchPhase === 'landing') && (
                <div style={styles.flame}>
                  <div style={styles.flameInner} />
                </div>
              )}
            </div>

            {/* Planted flag once landed */}
            {launchPhase === 'landed' && <div style={styles.marsFlag}>🚩</div>}

            {shield > 60 && launchPhase === 'idle' && <div style={styles.shieldGlow} />}

            {/* Pre-launch check list overlay */}
            {(launchPhase === 'checking' || launchPhase === 'ready') && (
              <div style={styles.checkOverlay}>
                <div style={styles.checkTitle}>PRE-LAUNCH CHECK</div>
                {checks.map((check, i) => (
                  <div key={i} style={styles.checkItem}>
                    <span>{check.name}</span>
                    <span style={styles.checkOk}>✓ {check.status}</span>
                  </div>
                ))}
                {launchPhase === 'ready' && (
                  <div style={styles.checkComplete}>✅ COMPLETE</div>
                )}
              </div>
            )}

            {/* Countdown overlay (launch + landing) */}
            {(launchPhase === 'countdown' ||
              launchPhase === 'launched' ||
              launchPhase === 'landing') &&
              countdownText && (
                <div
                  key={countdownText}
                  style={
                    launchPhase === 'launched'
                      ? styles.blastoffText
                      : styles.countdownNumber
                  }
                >
                  {countdownText}
                </div>
              )}

            {/* Touchdown success message */}
            {launchPhase === 'landed' && (
              <div style={styles.landedOverlay}>
                <div style={styles.touchdownText}>🎉 TOUCHDOWN! 🎉</div>
                <div style={styles.landedSub}>LANDING SUCCESSFUL</div>
                <div style={styles.landedWelcome}>
                  Welcome to Mars,
                  <br />
                  Astronaut Reef! 🔴
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LAUNCH SECTION */}
      <div style={styles.launchSection}>
        {launchPhase === 'idle' && (
          <button
            style={{ ...styles.button, ...styles.launchInitButton }}
            onClick={handleLaunchInitiation}
          >
            <span style={styles.buttonLabel}>📋</span>
            <span>LAUNCH INITIATION</span>
          </button>
        )}
        {launchPhase === 'checking' && (
          <div style={styles.launchStatus}>⏳ RUNNING PRE-LAUNCH CHECKS...</div>
        )}
        {launchPhase === 'ready' && (
          <button
            style={{ ...styles.button, ...styles.launchButton }}
            onClick={handleLaunch}
          >
            <span style={styles.buttonLabel}>🔥</span>
            <span>LAUNCH!</span>
          </button>
        )}
        {launchPhase === 'countdown' && (
          <div style={styles.launchStatus}>🔥 IGNITION! 🔥</div>
        )}
        {launchPhase === 'launched' && (
          <div style={styles.launchStatus}>🌟 WE HAVE LIFTOFF! 🌟</div>
        )}
        {launchPhase === 'landing' && (
          <div style={styles.launchStatus}>🛬 LANDING SEQUENCE...</div>
        )}
        {launchPhase === 'landed' && (
          <div style={styles.landedStatus}>🔴 ASTRONAUT REEF HAS LANDED ON MARS! 🔴</div>
        )}
      </div>

      {/* Control buttons */}
      <div style={styles.controlsArea}>
        <div style={styles.buttonRow}>
          <button style={styles.button} onClick={handleTurnLeft}>
            <span style={styles.buttonLabel}>⬅️</span>
            <span>TURN LEFT</span>
          </button>
          <button style={styles.button} onClick={handleAccelerate}>
            <span style={styles.buttonLabel}>⬆️</span>
            <span>ACCELERATE</span>
          </button>
          <button style={styles.button} onClick={handleTurnRight}>
            <span style={styles.buttonLabel}>➡️</span>
            <span>TURN RIGHT</span>
          </button>
        </div>

        <div style={styles.buttonRow}>
          <button
            style={{ ...styles.button, ...styles.shieldsButton }}
            onClick={handleShields}
          >
            <span style={styles.buttonLabel}>🛡️</span>
            <span>SHIELDS UP</span>
          </button>
          <button
            style={{ ...styles.button, ...styles.landingButton }}
            onClick={handleLanding}
          >
            <span style={styles.buttonLabel}>🛬</span>
            <span>LAND ON MARS</span>
          </button>
          <button style={styles.button} onClick={handleDecelerate}>
            <span style={styles.buttonLabel}>⬇️</span>
            <span>SLOW DOWN</span>
          </button>
        </div>

        <div style={styles.buttonRow}>
          <button
            style={{
              ...styles.button,
              ...styles.reverseThrusterButton,
              ...(reverseThrusterOn ? styles.reverseThrusterActive : {}),
            }}
            onClick={handleReverseThruster}
          >
            <span style={styles.buttonLabel}>{reverseThrusterOn ? '🔴' : '🔵'}</span>
            <span>{reverseThrusterOn ? 'DISENGAGE' : 'REVERSE THRUSTER'}</span>
          </button>
          <button
            style={{ ...styles.button, ...styles.resetButton }}
            onClick={handleReset}
          >
            <span style={styles.buttonLabel}>🔄</span>
            <span>RESET SHIP</span>
          </button>
        </div>
      </div>

      {/* Status indicators */}
      <div style={styles.statusBar}>
        {fuel < 20 && <div style={styles.warning}>⚠️ LOW FUEL</div>}
        {oxygen < 30 && <div style={styles.warning}>⚠️ LOW OXYGEN</div>}
        {temperature > 80 && <div style={styles.warning}>⚠️ OVERHEAT</div>}
        {shield < 40 && <div style={styles.warning}>⚠️ SHIELDS WEAK</div>}
        <div style={styles.blinkingIndicator} />
      </div>

      {/* ── SPACE TRAVEL OVERLAY ── */}
      {launchPhase === 'launched' && (
        <div style={styles.spaceOverlay}>

          {/* Deep-space background nebula blobs */}
          <div style={styles.nebula1} />
          <div style={styles.nebula2} />
          <div style={styles.nebula3} />

          {/* Streaking stars */}
          {STARS.map(star => (
            <div key={star.id} style={{
              position: 'absolute',
              top: `${star.top}%`,
              left: 0,
              width: `${star.length}px`,
              height: `${star.size}px`,
              backgroundColor: star.color,
              borderRadius: '50%',
              opacity: star.opacity,
              animationName: 'starStreak',
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }} />
          ))}

          {/* Planets & celestial objects */}
          {PLANETS.map((p, i) => (
            <div key={`p${i}`} style={{
              position: 'absolute',
              top: `${p.top}%`,
              left: 0,
              fontSize: `${p.size}px`,
              lineHeight: 1,
              animationName: 'spaceObjectFly',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              zIndex: 4,
            }}>{p.emoji}</div>
          ))}

          {/* Aliens — fly with a wobbly path and face left */}
          {ALIENS.map((a, i) => (
            <div key={`a${i}`} style={{
              position: 'absolute',
              top: `${a.top}%`,
              left: 0,
              fontSize: `${a.size}px`,
              lineHeight: 1,
              animationName: 'alienWobbleFly',
              animationDuration: `${a.duration}s`,
              animationDelay: `${a.delay}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              zIndex: 5,
            }}>{a.emoji}</div>
          ))}

          {/* Traveling rocket — top driven by rocketY state */}
          <div style={{ ...styles.travelShipWrap, top: `${rocketY}%` }}>
            <div style={styles.travelExhaust} />
            <div style={styles.travelRocketEmoji}>🚀</div>
          </div>

          {/* Laser beams */}
          {lasers.map(laser => (
            <div key={laser.id} style={{
              position: 'absolute',
              top: `${laser.y}%`,
              left: '14%',
              width: '80%',
              height: '5px',
              background: 'linear-gradient(to right, #00FF41, #80FFB0, rgba(0,255,65,0.1))',
              borderRadius: '3px',
              boxShadow: '0 0 8px #00FF41, 0 0 22px #00FF41, 0 0 45px rgba(0,255,65,0.4)',
              transform: 'translateY(-50%)',
              transformOrigin: 'left center',
              animationName: 'laserShoot',
              animationDuration: '0.5s',
              animationTimingFunction: 'ease-out',
              animationFillMode: 'forwards',
              zIndex: 8,
            }} />
          ))}

          {/* Banner */}
          <div style={styles.inFlightBanner}>
            🌌 ASTRONAUT REEF IS IN SPACE! 🌌
          </div>

          {/* Up / Down rocket controls */}
          <div style={styles.rocketControls}>
            <button
              style={styles.rocketCtrlBtn}
              onMouseDown={startMovingUp}
              onMouseUp={stopMovingRocket}
              onMouseLeave={stopMovingRocket}
              onTouchStart={(e) => { e.preventDefault(); startMovingUp(); }}
              onTouchEnd={stopMovingRocket}
            >⬆️</button>
            <button
              style={styles.rocketCtrlBtn}
              onMouseDown={startMovingDown}
              onMouseUp={stopMovingRocket}
              onMouseLeave={stopMovingRocket}
              onTouchStart={(e) => { e.preventDefault(); startMovingDown(); }}
              onTouchEnd={stopMovingRocket}
            >⬇️</button>
          </div>

          {/* Laser blaster button */}
          <button style={styles.laserBtn} onClick={handleLaser}>
            <span style={{ fontSize: '30px' }}>⚡</span>
            <span>LASER</span>
          </button>

          {/* Boost button */}
          <button style={styles.spaceBoostBtn} onClick={handleBoost}>
            <span style={{ fontSize: '30px' }}>🔥</span>
            <span>BOOST!</span>
          </button>

          {/* Round fuel gauge */}
          <div style={styles.fuelGaugeWrap}>
            <FuelGauge value={fuel} />
          </div>

          {/* Reset button */}
          <button style={styles.spaceResetBtn} onClick={handleReset}>
            🔄 END MISSION
          </button>
        </div>
      )}

      {/* ── MARS LANDING OVERLAY ── */}
      {(launchPhase === 'landing' || launchPhase === 'landed') && (
        <div style={styles.marsOverlay}>

          {/* Twinkling star field */}
          {STARS.slice(0, 55).map(star => (
            <div key={`ml${star.id}`} style={{
              position: 'absolute',
              top: `${star.top}%`,
              left: `${(star.id * 29.3 + 5) % 100}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: star.color,
              borderRadius: '50%',
              opacity: star.opacity * 0.65,
              animation: `twinkle ${1.4 + (star.id % 4) * 0.5}s ease-in-out ${(star.id * 0.28) % 2}s infinite alternate`,
            }} />
          ))}

          {/* Mars planet — centered on screen */}
          <div style={styles.marsOrbitalPlanet}>
            <div style={styles.marsOC1} />
            <div style={styles.marsOC2} />
            <div style={styles.marsOC3} />
            <div style={styles.marsAtmo} />
          </div>

          {/* Dashed orbital path ring */}
          {launchPhase === 'landing' && <div style={styles.marsOrbRing} />}

          {/* Rocket orbiting: nested-animation trick keeps emoji upright */}
          {launchPhase === 'landing' && !isDescending && (
            <div style={styles.marsOrbitAnchor}>
              <div style={styles.marsOrbitSpinner}>
                <div style={styles.marsOrbitRocket}>🚀</div>
              </div>
            </div>
          )}

          {/* Rocket descending on final two beats of countdown */}
          {isDescending && (
            <div style={styles.marsOrbitAnchor}>
              <div style={styles.marsDescentRocket}>🚀</div>
            </div>
          )}

          {/* Rocket resting on surface after touchdown */}
          {launchPhase === 'landed' && (
            <>
              <div style={styles.marsOrbitAnchor}>
                <div style={styles.marsLandedRocket}>🚀</div>
              </div>
              <div style={styles.marsLandedFlag}>🚩</div>
            </>
          )}

          {/* Countdown numbers */}
          {launchPhase === 'landing' && countdownText && (
            <div key={countdownText} style={styles.marsCountdown}>
              {countdownText}
            </div>
          )}

          {/* Status label */}
          {launchPhase === 'landing' && (
            <div style={styles.marsStatus}>
              {isDescending ? '🛬 FINAL APPROACH' : '🛸 ENTERING ORBIT'}
            </div>
          )}

          {/* Touchdown success panel */}
          {launchPhase === 'landed' && (
            <div style={styles.marsSuccessPanel}>
              <div style={styles.marsSuccessTitle}>🎉 TOUCHDOWN! 🎉</div>
              <div style={styles.marsSuccessSub}>LANDING SUCCESSFUL</div>
              <div style={styles.marsSuccessMsg}>
                Welcome to Mars,<br />Astronaut Reef! 🔴
              </div>
              <button style={styles.marsNewMissionBtn} onClick={handleReset}>
                🔄 NEW MISSION
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100vw',
    minHeight: '100vh',
    boxSizing: 'border-box',
    backgroundColor: '#0a0e27',
    color: '#00FF41',
    fontFamily: 'Courier New, monospace',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
    overflowY: 'auto',
    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0, 255, 65, 0.03) 0%, transparent 50%)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '12px',
    borderBottom: '3px solid #00FF41',
    paddingBottom: '10px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0,
    textShadow: '0 0 20px #00FF41, 0 0 40px #00FF41',
    letterSpacing: '2px',
  },
  blinkingLight: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#FF4444',
    boxShadow: '0 0 15px #FF4444',
    animation: 'blink 0.6s infinite',
  },
  displayArea: {
    display: 'flex',
    gap: '20px',
    marginBottom: '12px',
    flex: 1,
    minHeight: '230px',
  },
  gaugesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '200px',
    backgroundColor: 'rgba(0, 255, 65, 0.05)',
    padding: '15px',
    border: '2px solid #00FF41',
    borderRadius: '8px',
  },
  gauge: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  gaugeLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  gaugeBackground: {
    height: '20px',
    backgroundColor: 'rgba(0, 255, 65, 0.2)',
    border: '1px solid #00FF41',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    transition: 'width 0.3s ease-out',
  },
  gaugeValue: {
    fontSize: '11px',
    textAlign: 'right',
    opacity: 0.8,
  },
  mainScreen: {
    flex: 1,
    minHeight: '230px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    border: '3px solid #00FF41',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  screenContent: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacecraftIcon: {
    fontSize: '80px',
    animation: 'float 3s ease-in-out infinite',
  },
  warpEffect: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    background: 'radial-gradient(ellipse at center, rgba(0, 255, 65, 0.3) 0%, transparent 70%)',
    animation: 'warp 0.5s ease-out',
  },
  shieldGlow: {
    position: 'absolute',
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    border: '3px solid #00FF41',
    boxShadow: '0 0 30px #00FF41, inset 0 0 30px rgba(0, 255, 65, 0.2)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  controlsArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '12px',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  button: {
    padding: '14px 22px',
    fontSize: '15px',
    fontWeight: 'bold',
    fontFamily: 'Courier New, monospace',
    backgroundColor: '#1a4d2e',
    color: '#00FF41',
    border: '3px solid #00FF41',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.1s',
    boxShadow: '0 5px 15px rgba(0, 255, 65, 0.2)',
    minWidth: '150px',
  },
  buttonLabel: {
    fontSize: '24px',
  },
  shieldsButton: {
    backgroundColor: '#4d2e1a',
    borderColor: '#FFD700',
    color: '#FFD700',
    boxShadow: '0 5px 15px rgba(255, 215, 0, 0.2)',
  },
  boostButton: {
    backgroundColor: '#2d0044',
    borderColor: '#CC44FF',
    color: '#EE88FF',
    boxShadow: '0 0 18px rgba(180, 50, 255, 0.4)',
    animation: 'boostPulse 0.9s ease-in-out infinite',
  },
  landingButton: {
    backgroundColor: '#4d1f0f',
    borderColor: '#FF7A45',
    color: '#FF9966',
    boxShadow: '0 5px 15px rgba(255, 122, 69, 0.25)',
  },
  resetButton: {
    backgroundColor: '#4d1a1a',
    borderColor: '#FF4444',
    color: '#FF4444',
    boxShadow: '0 5px 15px rgba(255, 68, 68, 0.2)',
  },
  reverseThrusterButton: {
    backgroundColor: '#1a2a4d',
    borderColor: '#5B8CFF',
    color: '#7AADFF',
    boxShadow: '0 5px 15px rgba(91, 140, 255, 0.2)',
  },
  reverseThrusterActive: {
    backgroundColor: '#3a0a0a',
    borderColor: '#FF4444',
    color: '#FF8080',
    boxShadow: '0 0 20px rgba(255, 50, 50, 0.8), 0 0 40px rgba(255, 50, 50, 0.4)',
    animation: 'thrusterPulse 0.5s ease-in-out infinite',
  },
  statusBar: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: 'rgba(0, 255, 65, 0.05)',
    border: '2px solid #00FF41',
    borderRadius: '8px',
    minHeight: '30px',
  },
  warning: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FF4444',
    animation: 'blink 0.5s infinite',
  },
  blinkingIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#00FF41',
    marginLeft: 'auto',
    animation: 'blink 0.8s infinite',
  },
  launchSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '76px',
    marginBottom: '12px',
  },
  launchInitButton: {
    backgroundColor: '#2e2e4d',
    borderColor: '#A78BFA',
    color: '#A78BFA',
    boxShadow: '0 5px 15px rgba(167, 139, 250, 0.3)',
    minWidth: '260px',
  },
  launchButton: {
    backgroundColor: '#4d1500',
    borderColor: '#FF6B00',
    color: '#FF6B00',
    boxShadow: '0 0 25px rgba(255, 107, 0, 0.6)',
    minWidth: '260px',
    animation: 'launchPulse 0.7s ease-in-out infinite',
  },
  launchStatus: {
    fontSize: '24px',
    fontWeight: 'bold',
    textShadow: '0 0 15px currentColor',
    animation: 'blink 0.7s infinite',
  },
  checkOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    border: '2px solid #00FF41',
    borderRadius: '8px',
    padding: '20px 30px',
    minWidth: '260px',
    boxShadow: '0 0 25px rgba(0, 255, 65, 0.3)',
  },
  checkTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '12px',
    letterSpacing: '2px',
    borderBottom: '1px solid #00FF41',
    paddingBottom: '8px',
  },
  checkItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    fontSize: '14px',
    padding: '4px 0',
    animation: 'fadeIn 0.3s ease-out',
  },
  checkOk: {
    color: '#00FF41',
    fontWeight: 'bold',
  },
  checkComplete: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#00FF41',
    textAlign: 'center',
    marginTop: '12px',
    textShadow: '0 0 15px #00FF41',
    animation: 'fadeIn 0.4s ease-out',
  },
  countdownNumber: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '140px',
    fontWeight: 'bold',
    color: '#FF6B00',
    textShadow: '0 0 40px #FF6B00, 0 0 80px #FF6B00',
    animation: 'countPop 0.9s ease-out',
  },
  blastoffText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '40px',
    fontWeight: 'bold',
    color: '#FFD700',
    textShadow: '0 0 30px #FFD700',
    whiteSpace: 'nowrap',
    animation: 'blastoff 0.6s ease-out',
  },
  shipWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  shipLaunching: {
    animation: 'flyUp 2.2s ease-in forwards',
  },
  spacecraftUp: {
    animation: 'none',
    transform: 'rotate(-45deg)',
  },
  flame: {
    width: '34px',
    height: '78px',
    marginTop: '-10px',
    display: 'flex',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at top, #FFF6B0 0%, #FFD000 30%, #FF7A00 60%, #FF2D00 85%, transparent 100%)',
    borderRadius: '50% 50% 45% 45% / 25% 25% 90% 90%',
    filter: 'blur(2px)',
    boxShadow: '0 0 35px 6px rgba(255, 120, 0, 0.8)',
    transformOrigin: 'top center',
    animation: 'flicker 0.1s infinite alternate',
  },
  flameInner: {
    width: '14px',
    height: '50px',
    marginTop: '6px',
    background: 'radial-gradient(ellipse at top, #FFFFFF 0%, #BFE6FF 40%, transparent 80%)',
    borderRadius: '50% 50% 45% 45% / 25% 25% 90% 90%',
    animation: 'flicker 0.08s infinite alternate-reverse',
  },
  shipLanding: {
    animation: 'descend 5.8s ease-in-out forwards',
  },
  shipLanded: {
    transform: 'translateY(58px)',
  },
  marsGround: {
    position: 'absolute',
    bottom: '-40px',
    left: '-20%',
    width: '140%',
    height: '130px',
    background: 'radial-gradient(ellipse at top, #E2703A 0%, #C1440E 45%, #7A2808 100%)',
    borderRadius: '50%',
    boxShadow: '0 -6px 25px rgba(255, 120, 40, 0.4)',
    overflow: 'hidden',
  },
  crater1: {
    position: 'absolute',
    top: '18px',
    left: '30%',
    width: '40px',
    height: '14px',
    backgroundColor: 'rgba(90, 30, 10, 0.6)',
    borderRadius: '50%',
  },
  crater2: {
    position: 'absolute',
    top: '34px',
    left: '58%',
    width: '28px',
    height: '10px',
    backgroundColor: 'rgba(90, 30, 10, 0.6)',
    borderRadius: '50%',
  },
  marsFlag: {
    position: 'absolute',
    bottom: '70px',
    left: 'calc(50% + 55px)',
    fontSize: '34px',
    animation: 'fadeIn 0.6s ease-out',
  },
  landedOverlay: {
    position: 'absolute',
    top: '14px',
    left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    border: '2px solid #FF9966',
    borderRadius: '10px',
    padding: '12px 22px',
    boxShadow: '0 0 25px rgba(255, 122, 69, 0.5)',
    animation: 'fadeIn 0.6s ease-out',
  },
  touchdownText: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#FFD700',
    textShadow: '0 0 20px #FFD700',
  },
  landedSub: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#FF9966',
    letterSpacing: '2px',
    marginTop: '6px',
  },
  landedWelcome: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: '8px',
    lineHeight: 1.4,
  },
  landedStatus: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#FF9966',
    textShadow: '0 0 15px #FF7A45',
    textAlign: 'center',
    animation: 'blink 1s infinite',
  },

  // ── Space travel overlay ──────────────────────────────────────────────
  spaceOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 999,
    overflow: 'hidden',
    background: 'radial-gradient(ellipse at 20% 50%, #1a0050 0%, #00001a 50%, #000005 100%)',
    animation: 'spaceFadeIn 1.2s ease-out forwards',
  },
  nebula1: {
    position: 'absolute',
    top: '-10%', left: '20%',
    width: '60vw', height: '60vh',
    background: 'radial-gradient(ellipse, rgba(80,0,180,0.25) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'nebulaDrift 18s ease-in-out infinite alternate',
  },
  nebula2: {
    position: 'absolute',
    bottom: '-15%', right: '10%',
    width: '55vw', height: '55vh',
    background: 'radial-gradient(ellipse, rgba(0,60,180,0.2) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'nebulaDrift 22s ease-in-out infinite alternate-reverse',
  },
  nebula3: {
    position: 'absolute',
    top: '30%', left: '-10%',
    width: '40vw', height: '40vh',
    background: 'radial-gradient(ellipse, rgba(180,0,80,0.15) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'nebulaDrift 14s ease-in-out infinite alternate',
  },
  travelShipWrap: {
    position: 'absolute',
    left: '8%',
    /* top is set dynamically via rocketY state */
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    animation: 'rocketBob 2.2s ease-in-out infinite',
    filter: 'drop-shadow(0 0 18px rgba(255, 200, 80, 0.7))',
    transition: 'top 0.06s linear',
  },
  rocketControls: {
    position: 'absolute',
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    zIndex: 20,
  },
  rocketCtrlBtn: {
    width: '82px',
    height: '82px',
    fontSize: '34px',
    borderRadius: '50%',
    border: '3px solid rgba(100, 210, 255, 0.85)',
    backgroundColor: 'rgba(0, 30, 70, 0.8)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 22px rgba(100, 210, 255, 0.45), inset 0 0 12px rgba(100, 210, 255, 0.15)',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    fontFamily: 'inherit',
  },
  travelExhaust: {
    width: '70px',
    height: '22px',
    background: 'linear-gradient(to left, rgba(255,230,100,0.95), rgba(255,140,0,0.8), rgba(255,60,0,0.5), transparent)',
    borderRadius: '50%',
    filter: 'blur(4px)',
    marginRight: '-12px',
    animation: 'exhaustPulse 0.11s infinite alternate',
  },
  travelRocketEmoji: {
    fontSize: '80px',
    lineHeight: 1,
    transform: 'rotate(45deg)',
  },
  inFlightBanner: {
    position: 'absolute',
    top: '14px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '22px',
    fontWeight: 'bold',
    fontFamily: 'Courier New, monospace',
    color: '#FFE680',
    textShadow: '0 0 20px #FFD700, 0 0 40px rgba(255,215,0,0.4)',
    whiteSpace: 'nowrap',
    letterSpacing: '2px',
    animation: 'bannerPulse 2s ease-in-out infinite',
  },
  spaceResetBtn: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    padding: '12px 22px',
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: 'Courier New, monospace',
    backgroundColor: 'rgba(80,0,0,0.8)',
    color: '#FF6666',
    border: '2px solid #FF4444',
    borderRadius: '8px',
    cursor: 'pointer',
    zIndex: 20,
    boxShadow: '0 0 15px rgba(255,68,68,0.4)',
  },
  laserBtn: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    padding: '16px 26px',
    fontSize: '17px',
    fontWeight: 'bold',
    fontFamily: 'Courier New, monospace',
    backgroundColor: 'rgba(0, 60, 10, 0.85)',
    color: '#00FF41',
    border: '3px solid #00FF41',
    borderRadius: '12px',
    cursor: 'pointer',
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    boxShadow: '0 0 20px rgba(0,255,65,0.5), inset 0 0 12px rgba(0,255,65,0.1)',
  },
  spaceBoostBtn: {
    position: 'absolute',
    bottom: '135px',
    left: '20px',
    padding: '16px 26px',
    fontSize: '17px',
    fontWeight: 'bold',
    fontFamily: 'Courier New, monospace',
    backgroundColor: 'rgba(45, 0, 68, 0.88)',
    color: '#EE88FF',
    border: '3px solid #CC44FF',
    borderRadius: '12px',
    cursor: 'pointer',
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    boxShadow: '0 0 20px rgba(180,50,255,0.55), inset 0 0 12px rgba(180,50,255,0.1)',
    animation: 'boostPulse 0.9s ease-in-out infinite',
  },
  fuelGaugeWrap: {
    position: 'absolute',
    bottom: '14px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
  },

  // ── Mars landing overlay ──────────────────────────────────────────────
  marsOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 998,
    overflow: 'hidden',
    background: 'radial-gradient(ellipse at 50% 40%, #150030 0%, #04000F 60%, #000005 100%)',
    animation: 'spaceFadeIn 0.9s ease-out forwards',
  },
  marsOrbitalPlanet: {
    position: 'absolute',
    top: '50%', left: '50%',
    width: '240px', height: '240px',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 30%, #E8835C 0%, #C1440E 40%, #8B2A00 75%, #4A1200 100%)',
    boxShadow: '0 0 50px rgba(193,68,14,0.55), 0 0 100px rgba(193,68,14,0.2), inset -25px -25px 50px rgba(0,0,0,0.55)',
    zIndex: 3,
    overflow: 'hidden',
  },
  marsOC1: { position:'absolute', top:'24%', left:'18%', width:'52px', height:'18px', backgroundColor:'rgba(70,20,0,0.5)', borderRadius:'50%' },
  marsOC2: { position:'absolute', top:'55%', left:'54%', width:'36px', height:'12px', backgroundColor:'rgba(70,20,0,0.5)', borderRadius:'50%' },
  marsOC3: { position:'absolute', top:'68%', left:'26%', width:'26px', height:'9px',  backgroundColor:'rgba(70,20,0,0.45)', borderRadius:'50%' },
  marsAtmo: {
    position: 'absolute', inset: '-6px', borderRadius: '50%',
    background: 'radial-gradient(circle at 30% 25%, rgba(255,160,60,0.12) 0%, transparent 60%)',
    border: '3px solid rgba(220,100,40,0.25)',
  },
  marsOrbRing: {
    position: 'absolute',
    top: '50%', left: '50%',
    width: '390px', height: '390px',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    border: '1px dashed rgba(200,200,255,0.22)',
    zIndex: 2,
  },
  marsOrbitAnchor: {
    position: 'absolute',
    top: '50%', left: '50%',
    width: 0, height: 0,
    zIndex: 10,
  },
  marsOrbitSpinner: {
    animation: 'planetOrbit 2.6s linear infinite',
  },
  marsOrbitRocket: {
    position: 'absolute',
    top: '-197px', left: '-28px',
    fontSize: '55px', lineHeight: 1,
    animation: 'counterRotate 2.6s linear infinite',
  },
  marsDescentRocket: {
    position: 'absolute',
    left: '-28px',
    fontSize: '55px', lineHeight: 1,
    animation: 'marsDescend 2.8s cubic-bezier(0.45,0,0.2,1) forwards',
  },
  marsLandedRocket: {
    position: 'absolute',
    left: '-28px',
    fontSize: '50px', lineHeight: 1,
    transform: 'translate(0, -155px)',
    animation: 'marsLandBob 2.2s ease-in-out infinite',
  },
  marsLandedFlag: {
    position: 'absolute',
    top: '50%', left: '50%',
    fontSize: '38px',
    transform: 'translate(35px, -155px)',
    animation: 'fadeIn 0.7s ease-out',
    zIndex: 10,
  },
  marsCountdown: {
    position: 'absolute',
    top: '10%', left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '110px', fontWeight: 'bold',
    fontFamily: "'Courier New', monospace",
    color: '#FF6B00',
    textShadow: '0 0 35px #FF6B00, 0 0 70px rgba(255,107,0,0.4)',
    animation: 'countPop 0.9s ease-out',
    zIndex: 20,
  },
  marsStatus: {
    position: 'absolute',
    bottom: '28px', left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '20px', fontWeight: 'bold',
    fontFamily: "'Courier New', monospace",
    color: '#FFD700', textShadow: '0 0 14px #FFD700',
    whiteSpace: 'nowrap',
    animation: 'blink 1s infinite',
    zIndex: 20,
  },
  marsSuccessPanel: {
    position: 'absolute',
    top: '10%', left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    border: '2px solid #FF9966',
    borderRadius: '16px',
    padding: '24px 36px',
    boxShadow: '0 0 30px rgba(255,122,69,0.45)',
    zIndex: 25,
    animation: 'fadeIn 0.8s ease-out',
    whiteSpace: 'nowrap',
  },
  marsSuccessTitle: { fontSize:'32px', fontWeight:'bold', color:'#FFD700', textShadow:'0 0 20px #FFD700' },
  marsSuccessSub:   { fontSize:'17px', color:'#FF9966', letterSpacing:'2px', marginTop:'8px', fontFamily:'Courier New, monospace' },
  marsSuccessMsg:   { fontSize:'20px', color:'#FFFFFF', marginTop:'12px', lineHeight:1.5, fontFamily:'Courier New, monospace' },
  marsNewMissionBtn: {
    display: 'block',
    margin: '20px auto 0',
    padding: '14px 30px',
    fontSize: '16px', fontWeight: 'bold',
    fontFamily: 'Courier New, monospace',
    backgroundColor: 'rgba(80,0,0,0.85)',
    color: '#FF6666',
    border: '2px solid #FF4444',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 0 15px rgba(255,68,68,0.4)',
  },
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes blink {
    0%, 49%, 100% { opacity: 1; }
    50%, 99% { opacity: 0; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  
  @keyframes warp {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes fadeIn {
    0% { opacity: 0; transform: translateY(8px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes countPop {
    0% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
    30% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
  }

  @keyframes blastoff {
    0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }

  @keyframes flyUp {
    0% { transform: translateY(0); }
    100% { transform: translateY(-600px) scale(0.2); opacity: 0; }
  }

  @keyframes launchPulse {
    0%, 100% { box-shadow: 0 0 25px rgba(255, 107, 0, 0.6); }
    50% { box-shadow: 0 0 45px rgba(255, 107, 0, 1); }
  }

  @keyframes flicker {
    0% { transform: scaleY(1) scaleX(1); opacity: 0.92; }
    100% { transform: scaleY(1.35) scaleX(0.82); opacity: 1; }
  }

  @keyframes descend {
    0% { transform: translateY(-150px); }
    100% { transform: translateY(58px); }
  }

  @keyframes thrusterPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(255, 50, 50, 0.8), 0 0 40px rgba(255, 50, 50, 0.4); }
    50%       { box-shadow: 0 0 35px rgba(255, 50, 50, 1),   0 0 70px rgba(255, 50, 50, 0.7); }
  }

  @keyframes boostPulse {
    0%, 100% { box-shadow: 0 0 15px rgba(180, 50, 255, 0.5); }
    50%       { box-shadow: 0 0 35px rgba(180, 50, 255, 0.95), 0 0 60px rgba(180, 50, 255, 0.3); }
  }

  /* ── Space travel animations ── */
  @keyframes spaceFadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes nebulaDrift {
    0%   { transform: scale(1) translate(0, 0); }
    100% { transform: scale(1.15) translate(3%, 5%); }
  }

  @keyframes starStreak {
    0%   { transform: translateX(110vw); opacity: 1; }
    100% { transform: translateX(-40px); opacity: 0.4; }
  }

  @keyframes spaceObjectFly {
    0%   { transform: translateX(115vw) scale(0.5); opacity: 0; }
    8%   { opacity: 1; }
    85%  { opacity: 1; }
    100% { transform: translateX(-28vw) scale(1.3); opacity: 0; }
  }

  @keyframes alienWobbleFly {
    0%   { transform: scaleX(-1) translateX(-112vw) translateY(0px);   opacity: 0; }
    8%   { opacity: 1; }
    28%  { transform: scaleX(-1) translateX(-78vw)  translateY(-32px); opacity: 1; }
    55%  { transform: scaleX(-1) translateX(-50vw)  translateY(28px);  opacity: 1; }
    80%  { transform: scaleX(-1) translateX(-22vw)  translateY(-18px); opacity: 1; }
    92%  { opacity: 1; }
    100% { transform: scaleX(-1) translateX(15vw)   translateY(8px);   opacity: 0; }
  }

  @keyframes rocketBob {
    0%, 100% { transform: translateY(-50%) rotate(0deg); }
    50%       { transform: translateY(calc(-50% - 14px)) rotate(-2deg); }
  }

  @keyframes exhaustPulse {
    0%   { transform: scaleX(1)   scaleY(1);   opacity: 0.9; }
    100% { transform: scaleX(1.3) scaleY(0.65); opacity: 1; }
  }

  @keyframes bannerPulse {
    0%, 100% { opacity: 0.85; text-shadow: 0 0 20px #FFD700, 0 0 40px rgba(255,215,0,0.4); }
    50%       { opacity: 1;    text-shadow: 0 0 30px #FFD700, 0 0 60px rgba(255,215,0,0.7); }
  }

  @keyframes laserShoot {
    0%   { transform: translateY(-50%) scaleX(0);   opacity: 1; }
    45%  { transform: translateY(-50%) scaleX(1);   opacity: 1; }
    100% { transform: translateY(-50%) scaleX(1);   opacity: 0; }
  }

  /* ── Mars landing animations ── */
  @keyframes planetOrbit {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes counterRotate {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(-360deg); }
  }

  @keyframes marsDescend {
    0%   { transform: translate(-28px, -540px); }
    100% { transform: translate(-28px, -155px); }
  }

  @keyframes marsLandBob {
    0%, 100% { transform: translate(-28px, -155px); }
    50%       { transform: translate(-28px, -162px); }
  }

  @keyframes twinkle {
    0%   { opacity: 0.25; }
    100% { opacity: 0.85; }
  }
  
  button:active {
    transform: scale(0.95);
  }
  
  button:hover {
    box-shadow: 0 5px 20px rgba(0, 255, 65, 0.4) !important;
  }
`;
document.head.appendChild(style);

export default SpaceshipSimulator;

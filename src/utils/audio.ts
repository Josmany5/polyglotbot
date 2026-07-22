// Audio utilities for Polyglotbot
// Uses Google Translate Free TTS (public endpoint, no API key, no rate limits)
// Returns actual MP3 audio — doesn't depend on system voices

export function speakWebSpeech(text: string, langCode: string, speed: number = 1.0): Promise<void> {
  return playGoogleTTS(text, langCode, speed);
}

// Global audio element — created once, reused forever (no DOM spam)
let _globalAudio: HTMLAudioElement | null = null;

function getGlobalAudio(): HTMLAudioElement {
  if (!_globalAudio) {
    _globalAudio = new Audio();
    _globalAudio.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
    document.body.appendChild(_globalAudio);
  }
  // Abort any in-progress playback
  _globalAudio.pause();
  _globalAudio.removeAttribute('src');
  return _globalAudio;
}

// Play audio through Google Translate TTS URL (via our same-origin proxy)
function playGoogleTTS(text: string, langCode: string, speed: number = 1.0): Promise<void> {
  return new Promise((resolve) => {
    const cleanLang = langCode.split('-')[0].toLowerCase();
    const sanitized = encodeURIComponent(text.replace(/\n/g, ' ').trim().slice(0, 200));
    if (!sanitized) { resolve(); return; }

    // Use our own proxy to avoid CORS — server fetches the MP3 from Google Translate
    const url = `/api/free-tts?text=${sanitized}&lang=${cleanLang}`;
    console.log('Polyglotbot: Playing TTS via proxy:', text.slice(0, 40), cleanLang);

    const audio = getGlobalAudio();
    audio.playbackRate = speed;
    audio.volume = 1;
    audio.preload = 'auto';

    let resolved = false;
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      audio.pause();
      audio.removeAttribute('src');
    };

    const success = () => {
      console.log('Polyglotbot: Google TTS playback complete');
      cleanup();
      resolve();
    };

    const failure = () => {
      console.warn('Polyglotbot: Google TTS failed');
      cleanup();
      resolve(); // resolve anyway — don't block the UI
    };

    // Set up event handlers BEFORE setting src
    audio.oncanplaythrough = () => {
      console.log('Polyglotbot: Audio loaded, starting playback');
      audio.play().catch((err) => {
        console.warn('Polyglotbot: play() rejected:', err.message);
        failure();
      });
    };

    audio.onplay = () => console.log('Polyglotbot: Audio playing');

    audio.onended = () => {
      console.log('Polyglotbot: Audio ended naturally');
      success();
    };

    audio.onerror = (e) => {
      console.warn('Polyglotbot: Audio error:', audio.error?.code, audio.error?.message);
      failure();
    };

    // Safety timeout: if nothing happens in 10 seconds, give up
    const timeout = setTimeout(() => {
      console.warn('Polyglotbot: Google TTS timeout');
      failure();
    }, 10000);

    // Override onended to also clear the safety timeout
    audio.onended = () => {
      clearTimeout(timeout);
      success();
    };

    console.log('Polyglotbot: Loading audio from:', url.slice(0, 80));
    audio.src = url;
    audio.load();
  });
}

// Gemini base64 audio player
export function playBase64Audio(base64Audio: string, playbackRate: number = 1.0): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const binary = window.atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const mime = (bytes[0] === 0x52 && bytes[1] === 0x49) ? 'audio/wav' : 'audio/mpeg';
      const blob = new Blob([bytes.buffer], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = playbackRate;
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); reject(); };
      audio.play().catch(() => { URL.revokeObjectURL(url); reject(); });
    } catch { reject(); }
  });
}

// MAIN — called by all components
export async function playTextToSpeech(
  text: string,
  langCode: string,
  speed: number = 1.0,
  preloadedAudioBase64?: string
): Promise<void> {
  if (preloadedAudioBase64) {
    try { await playBase64Audio(preloadedAudioBase64, speed); return; } catch {}
  }
  await playGoogleTTS(text, langCode, speed);
}
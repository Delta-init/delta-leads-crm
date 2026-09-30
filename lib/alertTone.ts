// Short two-note chime played in the app when a lead is assigned.
// Built with WebAudio so there is no sound file to load. Browsers only allow
// audio after the user has interacted with the page, so the context is
// created lazily and resumed on the first tap/click/key.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

if (typeof window !== "undefined") {
  const unlock = () => {
    getContext()?.resume().catch(() => null);
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function playAlertTone(): void {
  const ac = getContext();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => null);

  const notes = [880, 1318.5]; // A5 → E6
  notes.forEach((freq, i) => {
    const start = ac.currentTime + i * 0.18;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.35);
  });

  if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
}

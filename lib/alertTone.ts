// The sounds the CRM plays when something arrives while it is open (the user,
// 2026-10-05): one for a new lead, another for everything else — reminders,
// team messages, status changes. Loud on purpose: both files are normalised to
// about −12 LUFS with peaks at −1 dB, and play at full volume.
//
// Played through WebAudio, from files fetched and decoded once. Browsers only
// allow audio after the user has interacted with the page, so the context is
// created lazily and resumed — and the files loaded — on the first
// tap/click/key. If a file can't be fetched or decoded, the old two-note chime
// plays instead, so an alert is never silent.
//
// A system notification shown while the CRM is closed (public/push-sw.js) uses
// the device's own notification sound: no website can choose that one.

export type AlertSound = "lead" | "other";

const FILES: Record<AlertSound, string> = {
  lead: "/sounds/new-lead.mp3",
  other: "/sounds/notification.mp3",
};

/** Several alerts at once — a batch of leads, a stack of reminders — ring once, not on top of each other. */
const QUIET_MS = 1500;

let ctx: AudioContext | null = null;
const buffers: Partial<Record<AlertSound, Promise<AudioBuffer | null>>> = {};
const lastPlayed: Partial<Record<AlertSound, number>> = {};

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** The sound, decoded once; null when it can't be had (the chime plays instead). */
function load(kind: AlertSound): Promise<AudioBuffer | null> {
  const ac = getContext();
  if (!ac) return Promise.resolve(null);
  buffers[kind] ??= fetch(FILES[kind])
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`${FILES[kind]}: ${res.status}`))))
    .then((data) => ac.decodeAudioData(data))
    .catch(() => {
      delete buffers[kind]; // try again next time
      return null;
    });
  return buffers[kind]!;
}

if (typeof window !== "undefined") {
  const unlock = () => {
    getContext()?.resume().catch(() => null);
    void load("lead");
    void load("other");
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

/** The old two-note chime (A5 → E6), for when a sound file is unavailable. */
function chime(ac: AudioContext): void {
  const notes = [880, 1318.5];
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
}

/**
 * Ring for a new lead ("lead") or for anything else ("other"), at full volume.
 * `force` — a test button — plays even straight after another alert.
 */
export function playAlertSound(kind: AlertSound, { force = false }: { force?: boolean } = {}): void {
  const ac = getContext();
  if (!ac) return;
  const now = Date.now();
  if (!force && now - (lastPlayed[kind] ?? 0) < QUIET_MS) return;
  lastPlayed[kind] = now;
  if (ac.state === "suspended") ac.resume().catch(() => null);

  void load(kind).then((buffer) => {
    if (!buffer) {
      chime(ac);
      return;
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.connect(ac.destination);
    source.start();
  });

  if (kind === "lead" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
}

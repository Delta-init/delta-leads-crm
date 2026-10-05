// The sounds the CRM plays when something arrives while it is open (the user,
// 2026-10-05): one for everything else — reminders, team messages, status
// changes — and, for a new lead, the team's lead sounds taken in turn (a second
// one added the same day: "shuffle with others"), so leads arriving one after
// another don't ring the same. Loud on purpose: every file is normalised to
// about −12 LUFS with peaks at −1 dB, and plays at full volume.
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

/** The new-lead sounds, taken in turn. */
export const LEAD_SOUNDS = ["/sounds/new-lead.mp3", "/sounds/new-lead-2.mp3"] as const;
const OTHER_SOUND = "/sounds/notification.mp3";

/** Several alerts at once — a batch of leads, a stack of reminders — ring once, not on top of each other. */
const QUIET_MS = 1500;

let ctx: AudioContext | null = null;
const buffers: Record<string, Promise<AudioBuffer | null> | undefined> = {};
const lastPlayed: Partial<Record<AlertSound, number>> = {};

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** A sound file, decoded once; null when it can't be had (the chime plays instead). */
function load(file: string): Promise<AudioBuffer | null> {
  const ac = getContext();
  if (!ac) return Promise.resolve(null);
  buffers[file] ??= fetch(file)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`${file}: ${res.status}`))))
    .then((data) => ac.decodeAudioData(data))
    .catch(() => {
      delete buffers[file]; // try again next time
      return null;
    });
  return buffers[file]!;
}

/*
 * The lead sounds in a shuffled round: each is played once before any plays
 * again, and a new round never starts with the one that ended the last — so
 * two leads in a row never ring the same.
 */
let leadRound: number[] = [];
let lastLead = -1;
export function nextLeadSound(random: () => number = Math.random): number {
  if (leadRound.length === 0) {
    leadRound = LEAD_SOUNDS.map((_, i) => i);
    for (let i = leadRound.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [leadRound[i], leadRound[j]] = [leadRound[j], leadRound[i]];
    }
    if (leadRound.length > 1 && leadRound[0] === lastLead) leadRound.push(leadRound.shift()!);
  }
  lastLead = leadRound.shift()!;
  return lastLead;
}

if (typeof window !== "undefined") {
  const unlock = () => {
    getContext()?.resume().catch(() => null);
    for (const file of LEAD_SOUNDS) void load(file);
    void load(OTHER_SOUND);
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
 * `force` — a test button — plays even straight after another alert; `leadSound`
 * picks one of the lead sounds instead of the next in turn.
 */
export function playAlertSound(
  kind: AlertSound,
  { force = false, leadSound }: { force?: boolean; leadSound?: number } = {},
): void {
  const ac = getContext();
  if (!ac) return;
  const now = Date.now();
  if (!force && now - (lastPlayed[kind] ?? 0) < QUIET_MS) return;
  lastPlayed[kind] = now;
  if (ac.state === "suspended") ac.resume().catch(() => null);

  const file = kind === "other" ? OTHER_SOUND : LEAD_SOUNDS[leadSound ?? nextLeadSound()] ?? LEAD_SOUNDS[0];
  void load(file).then((buffer) => {
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

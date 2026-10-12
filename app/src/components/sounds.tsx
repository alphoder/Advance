"use client";

import { useEffect, useState } from "react";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

/**
 * UI sounds, synthesised with Web Audio (no files). One document-level listener per action type,
 * so every user action plays exactly one sound: click → tap, typing → key, a scroll gesture → swish.
 */

type Kind = "tap" | "key" | "swish";
let ctx: AudioContext | undefined;
let muted = false;

function play(kind: Kind) {
  if (muted) return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(ctx.destination);

  if (kind === "swish") {
    // filtered noise sweep, quiet
    const len = 0.18;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + len);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.03, t + 0.05);
    out.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(bp).connect(out);
    src.start(t);
    src.stop(t + len);
    return;
  }

  const osc = ctx.createOscillator();
  osc.type = kind === "key" ? "triangle" : "sine";
  const [f0, f1, dur, vol] = kind === "key" ? [1900, 1500, 0.03, 0.025] : [720, 420, 0.09, 0.07];
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  out.gain.setValueAtTime(vol, t);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(out);
  osc.start(t);
  osc.stop(t + dur);
}

const INTERACTIVE = "a,button,summary,label,select,[role=button],[role=tab],[role=switch],input[type=checkbox],input[type=radio],input[type=range]";
const TYPING = "input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,[contenteditable=true]";

export function Sounds() {
  const [off, setOff] = useState(false);

  useEffect(() => {
    try { muted = localStorage.getItem("advance:muted") === "1"; } catch {}
    setOff(muted);

    // One click = one tap. Keyboard activation also fires `click`, so it's covered without a second sound.
    // A <label> click re-dispatches a click on its input; the 60ms guard keeps that to one sound.
    let last = 0;
    const onClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.(INTERACTIVE) || e.timeStamp - last < 60) return;
      last = e.timeStamp;
      play("tap");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey) return;
      if ((e.target as Element).closest?.(TYPING) && (e.key.length === 1 || e.key === "Backspace")) play("key");
    };
    // One scroll gesture = one swish: play when the wheel/touch gesture starts, quiet until it settles.
    // Listening to wheel/touch (not `scroll`) keeps link jumps and route changes to their single tap.
    let idle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (!idle) play("swish");
      clearTimeout(idle);
      idle = setTimeout(() => { idle = undefined; }, 260);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("wheel", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("touchmove", onScroll);
      clearTimeout(idle);
    };
  }, []);

  const toggle = () => {
    muted = !muted;
    setOff(muted);
    try { localStorage.setItem("advance:muted", muted ? "1" : "0"); } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label={off ? "Turn sounds on" : "Turn sounds off"}
      title={off ? "Sounds off" : "Sounds on"}
      className="press fixed bottom-[88px] right-7 z-50 grid size-10 place-items-center rounded-full border border-line-strong bg-[#161b24]/90 text-muted backdrop-blur hover:text-ink"
    >
      {off ? <SpeakerSlash className="size-4.5" /> : <SpeakerHigh className="size-4.5" />}
    </button>
  );
}

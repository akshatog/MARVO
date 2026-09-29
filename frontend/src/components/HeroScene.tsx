import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  CheckGlyph,
  CompassMark,
  CourseArrow,
  CrosshairGlyph,
  FishGlyph,
  LockGlyph,
  MicGlyph,
  SchoolGlyph,
  SpeakerGlyph,
  WarnGlyph,
  WaveGlyph,
  WindGlyph,
} from "./glyphs";

function prefersStill(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/* =====================================================================
   HeroSky — full-bleed living scene behind the hero:
   dawn → day → dusk sky loop, drifting sun + clouds, four layers of
   waves with mouse parallax, a sailing boat, fish, glints and buoys.
   ===================================================================== */
export function HeroSky({
  children,
  className = "",
  confidence,
}: {
  children: ReactNode;
  className?: string;
  confidence: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (prefersStill() || !ref.current) return;
    ref.current.style.setProperty("--mx", String(e.clientX / window.innerWidth - 0.5));
  };
  const onLeave = () => ref.current?.style.setProperty("--mx", "0");

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`hs-wrap ${className}`}>
      <div className="hs-scene" aria-hidden>
        {/* sky: day is the base, dawn and dusk fade in over it */}
        <div className="hs-sky hs-sky-day" />
        <div className="hs-sky hs-sky-dawn" />
        <div className="hs-sky hs-sky-dusk" />
        <div className="hs-sun">
          <i />
        </div>
        <span className="hs-cloud hs-cloud-1" />
        <span className="hs-cloud hs-cloud-2" />
        <span className="hs-cloud hs-cloud-3" />

        <div className="hs-sea">
          <div className="hs-wave hs-wave-1" />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <span key={k} className={`hs-glint hs-glint-${k}`} />
          ))}
          <div className="hs-boat">
            <svg viewBox="0 0 100 100" className="hs-boat-in">
              <path d="M50 8 L50 66 L18 66 Z" fill="#ffffff" stroke="rgba(11,42,91,.25)" strokeWidth="1" />
              <path d="M54 20 L54 66 L84 66 Z" fill="#fdf1dd" stroke="rgba(11,42,91,.2)" strokeWidth="1" />
              <path d="M50 5 V68" stroke="#0b2a5b" strokeWidth="2" strokeLinecap="round" />
              <path d="M50 5 L60 8 L50 11 Z" fill="#f26b4e" />
              <path d="M12 70 H90 L79 85 H25 Z" fill="#0b2a5b" />
              <path d="M12 70 H90" stroke="#ffb640" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="hs-wave hs-wave-2" />
          <span className="hs-fish hs-fish-1"><FishGlyph size={16} /></span>
          <span className="hs-fish hs-fish-2"><FishGlyph size={12} /></span>
          <span className="hs-fish hs-fish-3"><FishGlyph size={14} /></span>
          <div className="hs-wave hs-wave-3" />
          <div className="hs-wave hs-wave-4" />

          {/* the live readings ride the swell like buoys */}
          <span className="hs-buoy hs-buoy-a">
            <WaveGlyph size={14} /> 1.3 m
          </span>
          <span className="hs-buoy hs-buoy-b">
            <WindGlyph size={14} /> 19 km/h
          </span>
          <span className="hs-buoy hs-buoy-c">
            <CheckGlyph size={13} /> {confidence}%
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

/* =====================================================================
   HeroDemo — "Ask the sea": a question types itself in three languages,
   the ten agents light up one by one, a verdict dial fills.
   ===================================================================== */

type Tone = "safe" | "caution" | "danger";
type Scene = {
  q: string;
  chip: string;
  score: number;
  tone: Tone;
  verdict: string;
  detail: string;
  src: string;
  official?: boolean;
};

const SCENES: Scene[] = [
  {
    q: "Can I go fishing tomorrow?",
    chip: "EN",
    score: 24,
    tone: "safe",
    verdict: "Safe to sail",
    detail: "Waves 1.3 m · wind 19 km/h · best ground 42 km south-east",
    src: "Open-Meteo · INCOIS · 06:00",
  },
  {
    q: "क्या मैं कल मछली पकड़ने जा सकता हूँ?",
    chip: "हिं",
    score: 58,
    tone: "caution",
    verdict: "सावधानी से जाएँ",
    detail: "दोपहर में लहरें ऊँची — सुबह जल्दी लौटें",
    src: "Open-Meteo · IMD · 06:00",
  },
  {
    q: "पारादीपजवळ चक्रीवादळ आहे का?",
    chip: "मरा",
    score: 91,
    tone: "danger",
    verdict: "समुद्रात जाऊ नका",
    detail: "IMD चेतावणी लागू — अधिकृत इशारा मॉडेलवर मात करतो",
    src: "IMD · Coast Guard · 06:00",
    official: true,
  },
];

const UI: Record<string, Record<string, string>> = {
  en: {
    ask: "Ask ORCA",
    standby: "10 agents standing by",
    working: "agents working",
    done: "Verdict ready",
    risk: "RISK",
    placeholder: "Ask in any language…",
    official: "Official warning",
  },
  hi: {
    ask: "ORCA से पूछें",
    standby: "10 एजेंट तैयार",
    working: "एजेंट काम कर रहे हैं",
    done: "फ़ैसला तैयार",
    risk: "जोखिम",
    placeholder: "किसी भी भाषा में पूछें…",
    official: "आधिकारिक चेतावनी",
  },
  mr: {
    ask: "ORCA ला विचारा",
    standby: "10 एजंट तयार",
    working: "एजंट काम करत आहेत",
    done: "निर्णय तयार",
    risk: "धोका",
    placeholder: "कोणत्याही भाषेत विचारा…",
    official: "अधिकृत इशारा",
  },
};

const AGENT_ICONS = [
  CrosshairGlyph,
  SchoolGlyph,
  WarnGlyph,
  FishGlyph,
  CourseArrow,
  CompassMark,
  LockGlyph,
  SpeakerGlyph,
  MicGlyph,
  CheckGlyph,
];
const ACCENTS = ["#6fb6f0", "#12b5c8", "#ffb640", "#f26b4e", "#5b6cff"];

/** split into user-perceived characters so Devanagari never breaks mid-glyph */
function graphemes(s: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(s), (x) => x.segment);
  return Array.from(s);
}
const CHARS = SCENES.map((s) => graphemes(s.q));

const RING_R = 32;
const RING_C = 2 * Math.PI * RING_R;

export function HeroDemo({ language = "en" }: { language?: string }) {
  const ui = UI[language] ?? UI.en;
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"typing" | "think" | "verdict">("typing");
  const [typed, setTyped] = useState(0);
  const [lit, setLit] = useState(0);
  const [n, setN] = useState(0);

  useEffect(() => {
    const chars = CHARS[i];
    if (prefersStill()) {
      setTyped(chars.length);
      setLit(10);
      setPhase("verdict");
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    setPhase("typing");
    setTyped(0);
    setLit(0);

    const TYPE = 40;
    chars.forEach((_, k) => at(450 + k * TYPE, () => setTyped(k + 1)));
    const t1 = 450 + chars.length * TYPE + 320;
    at(t1, () => setPhase("think"));
    for (let k = 0; k < 10; k++) at(t1 + 110 + k * 120, () => setLit(k + 1));
    const t2 = t1 + 110 + 10 * 120 + 250;
    at(t2, () => setPhase("verdict"));
    at(t2 + 4200, () => setI((v) => (v + 1) % SCENES.length));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [i]);

  const sc = SCENES[i];

  useEffect(() => {
    if (phase !== "verdict") {
      setN(0);
      return;
    }
    if (prefersStill()) {
      setN(sc.score);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 800);
      setN(Math.round(sc.score * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, i, sc.score]);

  const text = CHARS[i].slice(0, typed).join("");
  const verdict = phase === "verdict";

  return (
    <div className="hd-card" data-tone={sc.tone}>
      <span className="hd-bar" aria-hidden />
      <div className="hd-head">
        <span className="hd-live">
          <i />
          {ui.ask}
        </span>
        <span className="hd-lang">{sc.chip}</span>
      </div>

      <div className="hd-input">
        <span className={`hd-mic ${phase === "typing" ? "on" : ""}`}>
          <MicGlyph size={14} />
        </span>
        <span className="hd-q font-display">
          {typed === 0 ? <span className="hd-ph">{ui.placeholder}</span> : text}
          {phase === "typing" && <i className="hd-caret" />}
        </span>
      </div>

      <div className="hd-agents">
        <div className="hd-ag-row">
          {AGENT_ICONS.map((Icon, k) => (
            <span key={k} className={`hd-ag ${k < lit ? "on" : ""}`} style={{ "--ac": ACCENTS[k % 5] } as CSSProperties}>
              <Icon size={13} />
            </span>
          ))}
        </div>
        <div className="hd-status">
          {verdict ? (
            <>
              <CheckGlyph size={11} /> {ui.done}
            </>
          ) : phase === "think" ? (
            `${lit}/10 ${ui.working}`
          ) : (
            ui.standby
          )}
        </div>
      </div>

      <div className={`hd-verdict ${verdict ? "show" : ""}`}>
        <div className="hd-dial">
          <svg viewBox="0 0 84 84" aria-hidden>
            <circle className="hd-track" cx="42" cy="42" r={RING_R} />
            <circle
              className="hd-prog"
              cx="42"
              cy="42"
              r={RING_R}
              strokeDasharray={RING_C}
              strokeDashoffset={verdict ? RING_C * (1 - sc.score / 100) : RING_C}
              transform="rotate(-90 42 42)"
            />
          </svg>
          <div className="hd-num">
            <b>{n}</b>
            <small>{ui.risk}</small>
          </div>
        </div>
        <div className="hd-vtext">
          <div className="hd-badges">
            <span className="hd-badge">{sc.verdict}</span>
            {sc.official && (
              <span className="hd-off">
                <LockGlyph size={10} /> {ui.official}
              </span>
            )}
          </div>
          <p className="hd-detail">{sc.detail}</p>
          <span className="hd-src">{sc.src}</span>
        </div>
      </div>
    </div>
  );
}
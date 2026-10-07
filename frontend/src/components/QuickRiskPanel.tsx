/**
 * QuickRiskPanel — calls GET /api/risk and shows a full per-agent
 * risk breakdown: score, category, each contributing factor, and
 * any deterministic overrides (official warnings).
 *
 * Used in: App.tsx Home tab and SystemPanel. There's no more a
 * "sparse" compact variant — a headline with no supporting numbers
 * is what read as unfinished on the Today page.
 */
import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import * as api from "../api";
import type { RiskCategory, Localized, Language } from "../types";
import RiskDial, { RISK_COLOR } from "./RiskDial";
import {
  ClockGlyph,
  CloudRainGlyph,
  CompassMark,
  CrosshairGlyph,
  FishGlyph,
  LockGlyph,
  WarnGlyph,
  WaveGlyph,
  WindGlyph,
} from "./glyphs";

/** Picks a small contextual icon for a free-text advice line, so the list
 * reads as more than a wall of identical bullets. Falls back to a plain
 * tick mark when nothing matches — works across en/hi/mr text. */
function adviceIcon(line: string) {
  const s = line.toLowerCase();
  if (/\d\s?(am|pm)|समय|वेळ|सुबह|सकाळ/.test(s)) return <ClockGlyph size={13} className="shrink-0" />;
  if (/wave|लहर|लाट|swell|sea/.test(s)) return <WaveGlyph size={13} className="shrink-0" />;
  if (/wind|हवा|वारा|breeze/.test(s)) return <WindGlyph size={13} className="shrink-0" />;
  if (/fish|मछली|मासे|catch/.test(s)) return <FishGlyph size={13} className="shrink-0" />;
  return <WarnGlyph size={13} className="shrink-0" />;
}

/** One icon per backend risk-factor key (wave / cyclone / wind / weather /
 * ocean / gis) so the factor list reads at a glance instead of as a plain
 * table of numbers. */
function factorIcon(key: string, size = 13) {
  switch (key) {
    case "wave":
    case "ocean":
      return <WaveGlyph size={size} className="shrink-0" />;
    case "wind":
      return <WindGlyph size={size} className="shrink-0" />;
    case "weather":
      return <CloudRainGlyph size={size} className="shrink-0" />;
    case "cyclone":
      return <WarnGlyph size={size} className="shrink-0" />;
    case "gis":
      return <CrosshairGlyph size={size} className="shrink-0" />;
    default:
      return <CompassMark size={size} className="shrink-0" />;
  }
}

interface QuickRiskPanelProps {
  lat: number;
  lon: number;
  language?: Language;
  /** Show the per-agent factor table. Off by default here — same as
   * before, this card only shows the verdict + advice on the Today
   * page; SystemPanel opts into the full breakdown explicitly. */
  full?: boolean;
}

const CATEGORY_LABEL: Localized<Record<string, string>> = {
  en: { LOW: "SAFE TO GO", MODERATE: "MODERATE RISK", HIGH: "STAY ASHORE", EXTREME: "DO NOT GO" },
  hi: { LOW: "जाने के लिए सुरक्षित", MODERATE: "मध्यम जोखिम", HIGH: "किनारे पर रहें", EXTREME: "बिल्कुल न जाएं" },
  mr: { LOW: "जाण्यासाठी सुरक्षित", MODERATE: "मध्यम धोका", HIGH: "किनाऱ्यावर राहा", EXTREME: "अजिबात जाऊ नका" },
  ta: { LOW: "செல்வதற்கு பாதுகாப்பானது", MODERATE: "மிதமான ஆபத்து", HIGH: "கரையிலேயே இருக்கவும்", EXTREME: "செல்ல வேண்டாம்" },
  te: { LOW: "వెళ్లడం సురక్షితం", MODERATE: "మితమైన ప్రమాదం", HIGH: "తీరంలోనే ఉండండి", EXTREME: "వెళ్లవద్దు" },
  bn: { LOW: "যাওয়া নিরাপদ", MODERATE: "মাঝারি ঝুঁকি", HIGH: "তীরে থাকুন", EXTREME: "যাবেন না" },
  ml: { LOW: "പോകാൻ സുരക്ഷിതം", MODERATE: "മിതമായ അപകടസാധ്യത", HIGH: "കരയിൽ തുടരുക", EXTREME: "പോകരുത്" }
};

const T: Localized<Record<string, string>> = {
  en: {
    riskAssessment: "Risk Assessment", conditions: "Current conditions at this location", outOf100: "out of 100 · risk score",
    advisoryActive: "Official advisory active", improve: "Conditions improve:", noOverrides: "No active overrides — model estimate only.",
    driving: "What's driving this score", pts: "pts", computing: "Computing risk…"
  },
  hi: {
    riskAssessment: "जोखिम मूल्यांकन", conditions: "इस स्थान पर वर्तमान स्थिति", outOf100: "100 में से · जोखिम स्कोर",
    advisoryActive: "आधिकारिक सलाह सक्रिय", improve: "स्थिति में सुधार:", noOverrides: "कोई सक्रिय ओवरराइड नहीं — केवल मॉडल अनुमान।",
    driving: "इस स्कोर का कारण", pts: "अंक", computing: "जोखिम की गणना हो रही है…"
  },
  mr: {
    riskAssessment: "धोका मूल्यांकन", conditions: "या ठिकाणी सध्याची परिस्थिती", outOf100: "100 पैकी · धोका स्कोर",
    advisoryActive: "अधिकृत सल्ला सक्रिय", improve: "परिस्थितीत सुधारणा:", noOverrides: "कोणतेही सक्रिय ओव्हरराइड नाही — फक्त मॉडेल अंदाज.",
    driving: "या स्कोरचे कारण", pts: "गुण", computing: "धोक्याची गणना करत आहे…"
  },
  ta: {
    riskAssessment: "ஆபத்து மதிப்பீடு", conditions: "இந்த இடத்தில் தற்போதைய நிலை", outOf100: "100க்கு · ஆபத்து மதிப்பெண்",
    advisoryActive: "அதிகாரப்பூர்வ ஆலோசனை செயலில் உள்ளது", improve: "நிலைமை மேம்படும்:", noOverrides: "செயலில் உள்ள மேலெழுதல்கள் இல்லை — மாதிரி மதிப்பீடு மட்டுமே.",
    driving: "இந்த மதிப்பெண்ணுக்கு காரணம்", pts: "புள்ளிகள்", computing: "ஆபத்தை கணக்கிடுகிறது…"
  },
  te: {
    riskAssessment: "ప్రమాద అంచనా", conditions: "ఈ ప్రదేశంలో ప్రస్తుత పరిస్థితులు", outOf100: "100కి · ప్రమాద స్కోర్",
    advisoryActive: "అధికారిక హెచ్చరిక చురుకుగా ఉంది", improve: "పరిస్థితులు మెరుగుపడతాయి:", noOverrides: "చురుకైన ఓవర్‌రైడ్‌లు లేవు — మోడల్ అంచనా మాత్రమే.",
    driving: "ఈ స్కోర్‌కు కారణం", pts: "పాయింట్లు", computing: "ప్రమాదాన్ని లెక్కిస్తోంది…"
  },
  bn: {
    riskAssessment: "ঝুঁকি মূল্যায়ন", conditions: "এই স্থানে বর্তমান অবস্থা", outOf100: "১০০ এর মধ্যে · ঝুঁকি স্কোর",
    advisoryActive: "সরকারি সতর্কতা সক্রিয়", improve: "অবস্থার উন্নতি হবে:", noOverrides: "কোনো সক্রিয় ওভাররাইড নেই — শুধুমাত্র মডেল অনুমান।",
    driving: "এই স্কোরের কারণ", pts: "পয়েন্ট", computing: "ঝুঁকি গণনা করা হচ্ছে…"
  },
  ml: {
    riskAssessment: "അപകടസാധ്യത വിലയിരുത്തൽ", conditions: "ഈ സ്ഥലത്തെ നിലവിലെ അവസ്ഥ", outOf100: "100-ൽ · റിസ്ക് സ്കോർ",
    advisoryActive: "ഔദ്യോഗിക മുന്നറിയിപ്പ് സജീവമാണ്", improve: "അവസ്ഥ മെച്ചപ്പെടുന്നു:", noOverrides: "സജീവമായ ഓവർറൈഡുകളില്ല — മോഡൽ കണക്കാക്കൽ മാത്രം.",
    driving: "ഈ സ്കോറിന് കാരണം", pts: "പോയിന്റുകൾ", computing: "അപകടസാധ്യത കണക്കാക്കുന്നു…"
  }
};



export default function QuickRiskPanel({ lat, lon, language = "en", full = false }: QuickRiskPanelProps) {
  const [data, setData] = useState<api.RiskBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const t = T[language] ?? T.en;
  const catLabel = CATEGORY_LABEL[language] ?? CATEGORY_LABEL.en;

  const fetchRisk = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.quickRisk(lat, lon);
      setData(result);
    } catch {
      // silently fail — data will be shown by FishingPanel anyway
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchRisk();
  }, [fetchRisk]);

  if (loading && !data) {
    return (
      <div className="panel flex items-center gap-3 px-4 py-3.5">
        <CompassMark size={20} className="animate-[spin_5s_linear_infinite] text-chart-500 opacity-70" />
        <span className="text-[12px] italic text-ink-400">{t.computing}</span>
      </div>
    );
  }

  if (!data) return null;

  const risk = data.risk;
  const cat = risk.category as RiskCategory;
  const color = RISK_COLOR[cat];
  const sortedFactors = [...(risk.factors ?? [])].sort((a, b) => b.contribution - a.contribution);

  return (
    <div className="panel rule-double animate-rise overflow-hidden" style={{ borderTopColor: color }}>
      {/* ---------- banner: the verdict, stated plainly, the same way the
          advice panel below states its headline — this is what makes the
          card read as a finished thought instead of a bare score. ---------- */}
      <div
        className="flex items-start gap-3 border-b px-5 py-4"
        style={{ borderColor: "var(--rule-faint)", background: `linear-gradient(180deg, ${color}12, transparent 85%)` }}
      >
        <span
          className="popin mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full"
          style={{ color, background: `${color}18` }}
        >
          <LockGlyph size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label !text-ink-400">{t.riskAssessment}</span>
            <span
              className="stamp !px-1.5 !py-0.5 !text-[9px] font-bold"
              style={{ color, border: `1px solid ${color}60`, background: `${color}12` }}
            >
              {catLabel[cat] ?? cat}
            </span>
          </div>
          <p className="mt-1 font-display text-[17px] font-semibold leading-snug text-ink-900">
            {risk.headline || t.conditions}
          </p>
        </div>
      </div>

      {/* ---------- score + at-a-glance readouts ---------- */}
      <div className="flex flex-wrap items-center gap-5 px-5 py-4">
        <RiskDial score={risk.score} category={cat} size={104} />
        <div className="min-w-[160px] flex-1 space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wide text-ink-400">{t.outOf100}</div>
          {risk.official_warning && (
            <div
              className="flex items-center gap-1.5 rounded-[2px] px-2 py-1 font-mono text-[11px] font-bold text-risk-extreme"
              style={{ background: "rgba(175,35,24,0.08)" }}
            >
              <WarnGlyph size={12} />
              {t.advisoryActive}
            </div>
          )}
          {risk.window && (
            <div className="flex items-center gap-1.5 text-[12px] italic text-ink-500">
              <ClockGlyph size={12} className="shrink-0 text-ink-400" />
              {t.improve} {risk.window}
            </div>
          )}
          {!risk.official_warning && !risk.window && (
            <div className="text-[12px] text-ink-400">{t.noOverrides}</div>
          )}
        </div>
      </div>

      {/* ---------- factor breakdown ---------- */}
      {full && sortedFactors.length > 0 && (
        <div className="border-t px-5 pt-3.5 pb-4" style={{ borderColor: "var(--rule-faint)" }}>
          <div className="mb-2.5 label">{t.driving}</div>
          <div className="space-y-3">
            {sortedFactors.map((f, i) => {
              const barPct = Math.max(3, Math.min(100, Math.round((f.factor ?? f.contribution / 100) * 100)));
              return (
                <div key={f.key} className="animate-rise" style={{ "--d": `${i * 0.05}s` } as CSSProperties}>
                  <div className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="flex items-center gap-2 font-semibold text-ink-700">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ color, background: `${color}14` }}>
                        {factorIcon(f.key)}
                      </span>
                      {f.label}
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-ink-500">
                      {Math.round(f.contribution)} {t.pts}
                    </span>
                  </div>
                  <div className="ml-8 mt-1 h-[5px] overflow-hidden rounded-full" style={{ background: "var(--rule-faint)" }}>
                    <div
                      className="grow-x h-full rounded-full"
                      style={{ width: `${barPct}%`, background: barPct > 60 ? color : "var(--chart-500)" }}
                    />
                  </div>
                  {f.detail && <div className="ml-8 mt-1 text-[11px] leading-relaxed text-ink-400">{f.detail}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- advice ---------- */}
      {risk.advice?.length > 0 && (
        <div className="border-t px-3.5 pt-3 pb-3.5" style={{ borderColor: "var(--rule-faint)" }}>
          <ul className="space-y-1">
            {risk.advice.map((tip, i) => (
              <li
                key={i}
                className="animate-rise group flex items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-[12.5px] leading-relaxed text-ink-700 transition-colors hover:bg-chart-100/35"
                style={{ "--d": `${0.1 + i * 0.04}s` } as CSSProperties}
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:scale-110"
                  style={{ color, background: `${color}14` }}
                >
                  {adviceIcon(tip)}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="flex items-center justify-between border-t bg-paper-150/50 px-5 py-2 font-mono text-[9.5px] uppercase tracking-wide text-ink-400"
        style={{ borderColor: "var(--rule-faint)" }}
      >
        <span>{(risk.sources ?? []).join(" · ")}</span>
        <span className="font-bold" style={{ color }}>{risk.mode}</span>
      </div>
    </div>
  );
}
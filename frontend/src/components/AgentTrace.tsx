import type { Localized, AgentTrace as Trace, Language } from "../types";

const LABEL: Localized<Record<string, string>> = {
  en: {
    intent: "Intent", weather: "Weather", ocean: "Ocean", pfz: "Fishing zones",
    cyclone: "Alerts", gis: "GIS", risk: "Risk engine", route: "Route",
    explanation: "Explanation",
  },
  hi: {
    intent: "आशय", weather: "मौसम", ocean: "समुद्र", pfz: "मत्स्य क्षेत्र",
    cyclone: "चेतावनियाँ", gis: "GIS", risk: "रिस्क इंजन", route: "मार्ग",
    explanation: "व्याख्या",
  },
  mr: {
    intent: "हेतू", weather: "हवामान", ocean: "समुद्र", pfz: "मासेमारी क्षेत्रे",
    cyclone: "इशारे", gis: "GIS", risk: "रिस्क इंजिन", route: "मार्ग",
    explanation: "स्पष्टीकरण",
  },
  ta: {
    intent: "நோக்கம்", weather: "வானிலை", ocean: "கடல்", pfz: "மீன்பிடி பகுதிகள்",
    cyclone: "எச்சரிக்கைகள்", gis: "GIS", risk: "ஆபத்து இயந்திரம்", route: "பாதை",
    explanation: "விளக்கம்",
  },
  te: {
    intent: "ఉద్దేశ్యం", weather: "వాతావరణం", ocean: "సముద్రం", pfz: "మత్స్య ప్రాంతాలు",
    cyclone: "హెచ్చరికలు", gis: "GIS", risk: "రిస్క్ ఇంజిన్", route: "మార్గం",
    explanation: "వివరణ",
  },
  bn: {
    intent: "উদ্দেশ্য", weather: "আবহাওয়া", ocean: "সমুদ্র", pfz: "মৎস্য অঞ্চল",
    cyclone: "সতর্কতা", gis: "GIS", risk: "ঝুঁকি ইঞ্জিন", route: "পথ",
    explanation: "ব্যাখ্যা",
  },
  ml: {
    intent: "ഉദ്ദേശം", weather: "കാലാവസ്ഥ", ocean: "സമുദ്രം", pfz: "മത്സ്യബന്ധന മേഖലകൾ",
    cyclone: "മുന്നറിയിപ്പുകൾ", gis: "GIS", risk: "റിസ്ക് എഞ്ചിൻ", route: "വഴി",
    explanation: "വിശദീകരണം",
  },
};

const T: Localized<Record<string, string>> = {
  en: {
    crew: "Agent crew",
    agents: "agents",
    total: "ms total",
    concurrent: "CONCURRENT",
    understand: "Understand", understandN: "parse the question",
    gather: "Gather", gatherN: "specialists run in parallel",
    decide: "Decide", decideN: "fuse evidence, plan",
    explain: "Explain", explainN: "answer in the user's language",
    note: "The planner decides which specialists a question needs and runs the independent ones concurrently. The risk engine waits for all of them — no agent's opinion can skip it.",
  },
  hi: {
    crew: "एजेंट टीम",
    agents: "एजेंट",
    total: "ms कुल",
    concurrent: "एक साथ",
    understand: "समझो", understandN: "सवाल परखो",
    gather: "जुटाओ", gatherN: "विशेषज्ञ एक साथ चलते हैं",
    decide: "तय करो", decideN: "प्रमाण जोड़ो, योजना बनाओ",
    explain: "समझाओ", explainN: "उपयोगकर्ता की भाषा में जवाब",
    note: "प्लानर तय करता है कि किस सवाल के लिए कौन से विशेषज्ञ चाहिए और स्वतंत्र एजेंटों को एक साथ चलाता है। रिस्क इंजन सबका इंतज़ार करता है — कोई भी एजेंट इसे लाँघ नहीं सकता।",
  },
  mr: {
    crew: "एजंट टीम",
    agents: "एजंट",
    total: "ms एकूण",
    concurrent: "एकाच वेळी",
    understand: "समजून घ्या", understandN: "प्रश्न पारखा",
    gather: "गोळा करा", gatherN: "तज्ज्ञ एकाच वेळी चालतात",
    decide: "ठरवा", decideN: "पुरावे जोडा, योजना करा",
    explain: "समजावा", explainN: "वापरकर्त्याच्या भाषेत उत्तर",
    note: "प्लॅनर ठरवतो की प्रश्नाला कोणते तज्ज्ञ हवेत आणि स्वतंत्र एजंटांना एकाच वेळी चालवतो. रिस्क इंजिन सर्वांची वाट पाहते — कोणताही एजंट ते टाळू शकत नाही.",
  },
  ta: {
    crew: "முகவர் குழு", agents: "முகவர்கள்", total: "ms மொத்தம்", concurrent: "ஒரே நேரத்தில்",
    understand: "புரிந்துகொள்", understandN: "கேள்வியை பகுப்பாய்வு செய்",
    gather: "சேகரி", gatherN: "நிபுணர்கள் ஒரே நேரத்தில் செயல்படுகிறார்கள்",
    decide: "முடிவு செய்", decideN: "சான்றுகளை இணை, திட்டமிடு",
    explain: "விளக்கு", explainN: "பயனரின் மொழியில் பதிலளி",
    note: "கேள்விக்கு எந்த நிபுணர்கள் தேவை என்பதை திட்டமிடுபவர் தீர்மானிக்கிறார் மற்றும் சுயாதீனமானவர்களை ஒரே நேரத்தில் இயக்குகிறார். ஆபத்து இயந்திரம் அனைவருக்காகவும் காத்திருக்கிறது.",
  },
  te: {
    crew: "ఏజెంట్ బృందం", agents: "ఏజెంట్లు", total: "ms మొత్తం", concurrent: "ఒకేసారి",
    understand: "అర్థం చేసుకో", understandN: "ప్రశ్నను విశ్లేషించు",
    gather: "సేకరించు", gatherN: "నిపుణులు ఒకే సమయంలో నడుస్తారు",
    decide: "నిర్ణయించు", decideN: "సాక్ష్యాలను కలపండి, ప్లాన్ చేయండి",
    explain: "వివరించు", explainN: "వినియోగదారు భాషలో సమాధానం ఇవ్వండి",
    note: "ప్రశ్నకు ఏ నిపుణులు అవసరమో ప్లానర్ నిర్ణయిస్తుంది మరియు స్వతంత్ర ఏజెంట్లను ఒకేసారి నడుపుతుంది. రిస్క్ ఇంజిన్ అందరి కోసం వేచి ఉంటుంది.",
  },
  bn: {
    crew: "এজেন্ট দল", agents: "এজেন্ট", total: "ms মোট", concurrent: "একযোগে",
    understand: "বুঝুন", understandN: "প্রশ্ন বিশ্লেষণ করুন",
    gather: "সংগ্রহ করুন", gatherN: "বিশেষজ্ঞরা একসাথে কাজ করে",
    decide: "সিদ্ধান্ত নিন", decideN: "প্রমাণ যুক্ত করুন, পরিকল্পনা করুন",
    explain: "ব্যাখ্যা করুন", explainN: "ব্যবহারকারীর ভাষায় উত্তর দিন",
    note: "পরিকল্পনাকারী নির্ধারণ করে কোন প্রশ্নের জন্য কোন বিশেষজ্ঞের প্রয়োজন এবং স্বাধীন এজেন্টদের একসাথে চালায়। ঝুঁকি ইঞ্জিন সবার জন্য অপেক্ষা করে।",
  },
  ml: {
    crew: "ഏജന്റ് സംഘം", agents: "ഏജന്റുമാർ", total: "ms ആകെ", concurrent: "ഒരേ സമയം",
    understand: "മനസ്സിലാക്കുക", understandN: "ചോദ്യം വിശകലനം ചെയ്യുക",
    gather: "ശേഖരിക്കുക", gatherN: "വിദഗ്ദ്ധർ ഒരേ സമയം പ്രവർത്തിക്കുന്നു",
    decide: "തീരുമാനിക്കുക", decideN: "തെളിവുകൾ ചേർക്കുക, ആസൂത്രണം ചെയ്യുക",
    explain: "വിശദീകരിക്കുക", explainN: "ഉപയോക്താവിന്റെ ഭാഷയിൽ മറുപടി നൽകുക",
    note: "ചോദ്യത്തിന് ഏത് വിദഗ്ദ്ധരെ ആവശ്യമുണ്ടെന്ന് പ്ലാനർ തീരുമാനിക്കുകയും സ്വതന്ത്ര ഏജന്റുമാരെ ഒരേ സമയം പ്രവർത്തിപ്പിക്കുകയും ചെയ്യുന്നു. റിസ്ക് എഞ്ചിൻ എല്ലാവർക്കുമായി കാത്തിരിക്കുന്നു.",
  },
};

/** The graph, as it actually executes. */
const PHASES: { key: string; agents: string[] }[] = [
  { key: "understand", agents: ["intent"] },
  { key: "gather", agents: ["weather", "ocean", "pfz", "cyclone", "gis"] },
  { key: "decide", agents: ["risk", "route"] },
  { key: "explain", agents: ["explanation"] },
];

const STATUS_DOT: Record<Trace["status"], string> = {
  ok: "#1D7A50",
  degraded: "#A17000",
  failed: "#AF2318",
  skipped: "#82949F",
};

/**
 * The crew manifest — the panel that proves MARVO is a crew rather than a
 * single prompt. Grouped by execution phase so the parallel fan-out is
 * visible, with real measured latencies, set like a ship's log.
 */
export default function AgentTracePanel({
  trace,
  elapsed,
  language = "en",
  explanationSource = "template",
}: {
  trace: Trace[];
  elapsed?: number;
  language?: Language;
  explanationSource?: "llm" | "template";
}) {
  if (!trace.length) return null;
  const t = T[language] ?? T.en;
  const labels = LABEL[language] ?? LABEL.en;

  const byName = new Map(trace.map((x) => [x.agent, x]));
  const maxLatency = Math.max(...trace.map((x) => x.latency_ms), 1);
  const ran = PHASES.map((p) => ({
    ...p,
    title: t[p.key],
    note: t[`${p.key}N`],
    rows: p.agents.map((a) => byName.get(a)).filter(Boolean) as Trace[],
  })).filter((p) => p.rows.length);

  return (
    <div className="panel overflow-hidden">
      <div className="hd">
        <span className="label">{t.crew}</span>
        <span className="font-mono text-[10px] tabular-nums text-ink-400">
          {trace.length} {t.agents} · {elapsed ?? trace.reduce((s, x) => s + x.latency_ms, 0)}{" "}
          {t.total}
        </span>
      </div>

      <div className="space-y-3.5 px-4 py-3.5">
        {ran.map((phase) => (
          <div key={phase.key}>
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="font-display text-[13px] font-bold text-ink-900">{phase.title}</span>
              <span className="text-[10.5px] italic text-ink-400">{phase.note}</span>
              {phase.key === "gather" && phase.rows.length > 1 && (
                <span className="ml-auto border border-chart-500/50 bg-chart-100/50 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wide text-chart-700">
                  ∥ {phase.rows.length} {t.concurrent}
                </span>
              )}
            </div>

            <div
              className={
                phase.key === "gather"
                  ? "space-y-1 border-l-2 border-chart-500/40 pl-2.5"
                  : "space-y-1"
              }
            >
              {phase.rows.map((row) => {
                return (
                  // Deliberately NOT per-row entrance-animated. A staggered
                  // animation with fill-mode:both leaves rows at opacity 0 if
                  // animations never run (hidden tab, reduced motion, some
                  // projectors) — and an invisible agent trace during a demo,
                  // or invisible safety data, is not an acceptable failure.
                  <div
                    key={row.agent}
                    className="group relative rounded-[2px] border bg-paper-100 px-2.5 py-1.5 pl-3 transition-colors hover:bg-paper-150"
                    style={{
                      borderColor:
                        row.status === "ok" || row.status === "skipped"
                          ? "var(--rule-faint)"
                          : STATUS_DOT[row.status] + "66",
                      boxShadow: `inset 2px 0 0 ${STATUS_DOT[row.status]}`,
                    }}
                  >
                    <div className="flex items-center gap-2 text-[11.5px]">
                      <span
                        className="h-2 w-2 shrink-0 rotate-45 transition-transform group-hover:scale-125"
                        style={{ background: STATUS_DOT[row.status] }}
                      />
                      <span className="w-[96px] shrink-0 font-semibold text-ink-900">
                        {labels[row.agent] ?? row.agent}
                      </span>
                      {row.agent === "explanation" && explanationSource === "llm" && (
                        <span
                          title="Answer generated by Groq LLM"
                          className="shrink-0 rounded-sm border border-chart-500/60 bg-chart-100/60 px-1.5 py-px font-mono text-[8px] font-bold tracking-wider text-chart-700"
                        >
                          LLM
                        </span>
                      )}
                      {row.agent === "explanation" && explanationSource === "template" && (
                        <span
                          title="Answer from template (LLM off or unavailable)"
                          className="shrink-0 rounded-sm border border-ink-300/50 bg-paper-150 px-1.5 py-px font-mono text-[8px] tracking-wider text-ink-400"
                        >
                          TPL
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-ink-500">
                        {row.summary || "—"}
                      </span>
                      <span className="shrink-0 font-mono text-[9.5px] tabular-nums text-ink-400">
                        {row.latency_ms}ms
                      </span>
                    </div>
                    {row.latency_ms > 0 && (
                      <div className="mt-1 h-[2px] overflow-hidden bg-ink-900/[0.07]">
                        <div
                          className="grow-x h-full bg-chart-500/70 transition-all duration-500"
                          style={{ width: `${(row.latency_ms / maxLatency) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p
        className="border-t px-4 py-2.5 text-[10.5px] italic leading-relaxed text-ink-400"
        style={{ borderColor: "var(--rule-faint)" }}
      >
        {t.note}
      </p>
    </div>
  );
}
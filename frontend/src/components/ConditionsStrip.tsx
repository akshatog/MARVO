import type { Localized, ChatResponse, Language } from "../types";

const L: Localized<Record<string, string>> = {
  en: { wave: "Wave", wind: "Wind", sea: "Sea state", vis: "Visibility", sst: "Sea temp", rain: "Rain" },
  hi: { wave: "लहरें", wind: "हवा", sea: "समुद्र", vis: "दृश्यता", sst: "तापमान", rain: "वर्षा" },
  mr: { wave: "लाटा", wind: "वारा", sea: "समुद्र", vis: "दृश्यमानता", sst: "तापमान", rain: "पाऊस" },
  ta: { wave: "அலை", wind: "காற்று", sea: "கடல் நிலை", vis: "பார்வைதிறன்", sst: "கடல் வெப்பம்", rain: "மழை" },
  te: { wave: "అల", wind: "గాలి", sea: "సముద్ర స్థితి", vis: "దృశ్యత", sst: "సముద్ర ఉష్ణోగ్రత", rain: "వర్షం" },
  bn: { wave: "ঢেউ", wind: "বাতাস", sea: "সমুদ্রের অবস্থা", vis: "দৃশ্যমানতা", sst: "সমুদ্রের তাপমাত্রা", rain: "বৃষ্টি" },
  ml: { wave: "തിര", wind: "കാറ്റ്", sea: "കടൽ അവസ്ഥ", vis: "കാഴ്ച", sst: "കടൽ താപനില", rain: "മഴ" },
};

/** Reads the traced evidence rows rather than duplicating any parsing. */
function findEvidence(res: ChatResponse, label: string): string | null {
  const row = res.evidence.find((e) => e.label.toLowerCase() === label.toLowerCase());
  return row ? row.value : null;
}

/** One instrument bank: six readings behind hairline dividers, like a bridge console. */
export default function ConditionsStrip({
  res,
  language = "en",
}: {
  res: ChatResponse;
  language?: Language;
}) {
  const t = L[language] ?? L.en;
  const tiles = [
    { label: t.wave, value: findEvidence(res, "Wave height"), accent: true },
    { label: t.wind, value: findEvidence(res, "Wind"), accent: true },
    { label: t.sea, value: findEvidence(res, "Sea state") },
    { label: t.rain, value: findEvidence(res, "Rain probability") },
    { label: t.vis, value: findEvidence(res, "Visibility") },
    { label: t.sst, value: findEvidence(res, "Sea surface temperature") },
  ];

  return (
    <div className="panel grid grid-cols-3 overflow-hidden sm:grid-cols-6">
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className={`min-w-0 px-3 py-2.5 transition-colors hover:bg-chart-100/50 ${i > 0 ? "border-l" : ""} ${
            tile.accent ? "bg-chart-100/40" : ""
          }`}
          style={{
            borderColor: "var(--rule-faint)",
            borderTop: tile.accent ? "2px solid #2a7391" : "2px solid transparent",
          }}
        >
          <div className="label truncate !text-[9px]">{tile.label}</div>
          <div className="mt-1 truncate font-mono text-[14.5px] font-bold tabular-nums leading-none text-ink-900">
            {tile.value ?? "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
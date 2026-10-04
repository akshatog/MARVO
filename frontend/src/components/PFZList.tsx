import type { Localized, Language } from "../types";
import { SchoolGlyph } from "./glyphs";

/** Only the fields this list actually renders — lets it accept either the
 * chat endpoint's PFZZone[] or an outlook's FishingArea[] without a mapping step. */
export interface ZoneLike {
  rank: number;
  distance_km: number;
  bearing: string;
  sst_c: number | null;
  chlorophyll_mg_m3: number | null;
  wave_height_m: number | null;
  confidence: number;
}

const L: Localized<Record<string, string>> = {
  en: {
    title: "Potential fishing zones",
    note: "Derived from sea-surface-temperature fronts and chlorophyll — a likely area, never a guarantee of fish.",
    conf: "confidence",
    away: "away",
  },
  hi: {
    title: "संभावित मत्स्य क्षेत्र",
    note: "समुद्री सतह तापमान और क्लोरोफिल से अनुमानित — संभावित क्षेत्र, मछली की गारंटी नहीं।",
    conf: "भरोसा",
    away: "दूर",
  },
  mr: {
    title: "संभाव्य मासेमारी क्षेत्रे",
    note: "समुद्र पृष्ठभाग तापमान व क्लोरोफिलवरून काढलेले — शक्यता असलेला भाग, माशांची हमी नाही.",
    conf: "भरवसा",
    away: "अंतरावर",
  },
  ta: { title: "சாத்தியமான மீன்பிடி மண்டலங்கள்", note: "கடல் மேற்பரப்பு வெப்பநிலை மற்றும் குளோரோபில் மூலம் பெறப்பட்டது — வாய்ப்புள்ள பகுதி, மீன் உத்தரவாதம் இல்லை.", conf: "நம்பிக்கை", away: "தூரத்தில்" },
  te: { title: "సంభావ్య మత్స్య ప్రాంతాలు", note: "సముద్ర ఉపరితల ఉష్ణోగ్రత మరియు క్లోరోఫిల్ నుండి తీసుకోబడింది — సాధ్యమైన ప్రాంతం, చేపలకు ఎటువంటి హామీ లేదు.", conf: "విశ్వాసం", away: "దూరంగా" },
  bn: { title: "সম্ভাব্য মৎস্য অঞ্চল", note: "সমুদ্র পৃষ্ঠের তাপমাত্রা এবং ক্লোরোফিল থেকে প্রাপ্ত — একটি সম্ভাব্য এলাকা, মাছের কোন গ্যারান্টি নেই।", conf: "আস্থা", away: "দূরে" },
  ml: { title: "സാധ്യമായ മത്സ്യബന്ധന മേഖലകൾ", note: "കടൽ ഉപരിതല താപനിലയും ക്ലോറോഫില്ലും അടിസ്ഥാനമാക്കിയുള്ളത് — സാധ്യതയുള്ള പ്രദേശം, മത്സ്യത്തിന് യാതൊരു ഉറപ്പുമില്ല.", conf: "ആത്മവിശ്വാസം", away: "അകലെ" },
};

export default function PFZList({
  zones,
  meta,
  language = "en",
}: {
  zones: ZoneLike[];
  meta?: { data_quality?: string; quality_note?: string };
  language?: Language;
}) {
  if (!zones.length) return null;
  const t = L[language] ?? L.en;

  return (
    <div className="panel overflow-hidden">
      <div className="hd flex items-center justify-between">
        <span className="label flex items-center gap-2">
          {t.title}
          <SchoolGlyph size={26} className="swim text-chart-500" />
        </span>
        {meta?.data_quality && (
          <span 
            className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-[2px]"
            style={{
              backgroundColor: meta.data_quality === "official_advisory" ? "#E6F4EA" : meta.data_quality === "satellite_enriched" ? "#E8F0FE" : "#FCE8E6",
              color: meta.data_quality === "official_advisory" ? "#137333" : meta.data_quality === "satellite_enriched" ? "#1967D2" : "#C5221F",
            }}
            title={meta.quality_note}
          >
            {meta.data_quality.replace("_", " ")}
          </span>
        )}
      </div>
      <div className="space-y-2 px-4 py-3.5">
        {zones.map((z) => {
          const best = z.rank === 1;
          const ring = best ? "#1D7A50" : "#2A7391";
          return (
            <div
              key={z.rank}
              className={`group flex items-center gap-3 rounded-[2px] border px-3 py-2.5 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md ${
                best ? "border-risk-low/60 bg-risk-low/[0.05]" : "bg-paper-100 hover:border-ink-700"
              }`}
              style={best ? undefined : { borderColor: "var(--rule)" }}
            >
              {/* buoy badge — same symbology as the chart */}
              <div className="relative shrink-0" style={{ color: ring }}>
                <span className="badge-ping" />
                <div
                  className="grid h-9 w-9 place-items-center rounded-full border-[3px] bg-paper-50 font-display text-[14px] font-extrabold text-ink-900"
                  style={{ borderColor: ring }}
                >
                  {z.rank}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[13px] font-bold tabular-nums text-ink-900">
                    {z.distance_km} km
                  </span>
                  <span className="text-[11px] text-ink-500">{z.bearing}</span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[10.5px] text-ink-400">
                  SST {z.sst_c ?? "—"}°C · Chl {z.chlorophyll_mg_m3 ?? "—"} mg/m³
                  {z.wave_height_m != null ? ` · ${z.wave_height_m} m` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="sounding text-[17px] tabular-nums"
                  style={{ color: best ? "#1D7A50" : "#2A7391" }}
                >
                  {Math.round(z.confidence * 100)}%
                </div>
                <div className="font-mono text-[8.5px] uppercase tracking-wide text-ink-400">
                  {t.conf}
                </div>
              </div>
            </div>
          );
        })}
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
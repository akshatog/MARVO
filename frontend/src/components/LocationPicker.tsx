import { useEffect, useRef, useState } from "react";
import type { Localized, Language } from "../types";
import { CrosshairGlyph } from "./glyphs";

export interface PickedLocation {
  latitude: number;
  longitude: number;
  label: string;
  source: "gps" | "map" | "port" | "default";
}

/** Landing centres a fisher can pick without typing coordinates. */
export const PORTS: { name: string; state: string; lat: number; lon: number }[] = [
  { name: "Mumbai", state: "Maharashtra", lat: 18.922, lon: 72.8347 },
  { name: "Ratnagiri", state: "Maharashtra", lat: 16.9902, lon: 73.312 },
  { name: "Panaji (Goa)", state: "Goa", lat: 15.4909, lon: 73.8278 },
  { name: "Veraval", state: "Gujarat", lat: 20.907, lon: 70.3679 },
  { name: "Kochi", state: "Kerala", lat: 9.9312, lon: 76.2673 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707 },
  { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lon: 83.2185 },
  { name: "Paradip", state: "Odisha", lat: 20.2648, lon: 86.6947 },
  { name: "Digha", state: "West Bengal", lat: 21.627, lon: 87.509 },
  { name: "Port Blair", state: "Andaman & Nicobar", lat: 11.6234, lon: 92.7265 },
];

const PORT_NAMES: Localized<Record<string, string>> = {
  en: {},
  hi: { Mumbai: "मुंबई", Ratnagiri: "रत्नागिरी", "Panaji (Goa)": "पणजी (गोवा)", Veraval: "वेरावल", Kochi: "कोच्चि", Chennai: "चेन्नई", Visakhapatnam: "विशाखापत्तनम", Paradip: "पारादीप", Digha: "दीघा", "Port Blair": "पोर्ट ब्लेयर" },
  mr: { Mumbai: "मुंबई", Ratnagiri: "रत्नागिरी", "Panaji (Goa)": "पणजी (गोवा)", Veraval: "वेरावळ", Kochi: "कोची", Chennai: "चेन्नई", Visakhapatnam: "विशाखापट्टणम", Paradip: "पारादीप", Digha: "दीघा", "Port Blair": "पोर्ट ब्लेअर" },
  ta: { Mumbai: "மும்பை", Ratnagiri: "ரத்னகிரி", "Panaji (Goa)": "பனாஜி (கோவா)", Veraval: "வேராவல்", Kochi: "கொச்சி", Chennai: "சென்னை", Visakhapatnam: "விசாகப்பட்டினம்", Paradip: "பாராதிப்", Digha: "திகா", "Port Blair": "போர்ட் பிளேர்" },
  te: { Mumbai: "ముంబై", Ratnagiri: "రత్నగిరి", "Panaji (Goa)": "పనాజీ (గోవా)", Veraval: "వేరావల్", Kochi: "కొచ్చి", Chennai: "చెన్నై", Visakhapatnam: "విశాఖపట్నం", Paradip: "పారాదీప్", Digha: "దిఘా", "Port Blair": "పోర్ట్ బ్లెయిర్" },
  bn: { Mumbai: "মুম্বাই", Ratnagiri: "রত্নগিরি", "Panaji (Goa)": "পানাজি (গোয়া)", Veraval: "ভেরাভল", Kochi: "কোচি", Chennai: "চেন্নাই", Visakhapatnam: "বিশাখাপত্তনম", Paradip: "পারাদীপ", Digha: "দিঘা", "Port Blair": "পোর্ট ব্লেয়ার" },
  ml: { Mumbai: "മുംബൈ", Ratnagiri: "രത്നഗിരി", "Panaji (Goa)": "പനാജി (ഗോവ)", Veraval: "വേരാവൽ", Kochi: "കൊച്ചി", Chennai: "ചെന്നൈ", Visakhapatnam: "വിശാഖപട്ടണം", Paradip: "പാരാദീപ്", Digha: "ദിഘ", "Port Blair": "പോർട്ട് ബ്ലെയർ" }
};


const T: Localized<Record<string, string>> = {
  en: {
    yourLocation: "Your location",
    useGps: "Use my location",
    locating: "Finding you…",
    denied: "Location blocked — pick your harbour below",
    unavailable: "Location unavailable — pick your harbour below",
    pickPort: "Choose harbour",
    tapMap: "You can also tap anywhere on the map",
    gps: "GPS",
    search: "Search harbour",
  },
  hi: {
    yourLocation: "आपका स्थान",
    useGps: "मेरा स्थान लें",
    locating: "आपको खोज रहे हैं…",
    denied: "स्थान बंद है — नीचे अपना बंदरगाह चुनें",
    unavailable: "स्थान उपलब्ध नहीं — नीचे अपना बंदरगाह चुनें",
    pickPort: "बंदरगाह चुनें",
    tapMap: "आप नक्शे पर कहीं भी टैप कर सकते हैं",
    gps: "जीपीएस",
    search: "बंदरगाह खोजें",
  },
  mr: {
    yourLocation: "तुमचे ठिकाण",
    useGps: "माझे ठिकाण घ्या",
    locating: "तुम्हाला शोधत आहे…",
    denied: "ठिकाण बंद आहे — खाली तुमचे बंदर निवडा",
    unavailable: "ठिकाण उपलब्ध नाही — खाली तुमचे बंदर निवडा",
    pickPort: "बंदर निवडा",
    tapMap: "तुम्ही नकाशावर कुठेही टॅप करू शकता",
    gps: "जीपीएस",
    search: "बंदर शोधा",
  },
  ta: { yourLocation: "உங்கள் இடம்", useGps: "என் இடத்தை பயன்படுத்து", locating: "தேடுகிறது…", denied: "இடம் மறுக்கப்பட்டது — துறைமுகத்தை தேர்வு செய்", unavailable: "இடம் இல்லை — துறைமுகத்தை தேர்வு செய்", pickPort: "துறைமுகத்தை தேர்வு செய்", tapMap: "வரைபடத்தில் தட்டவும்", gps: "GPS", search: "துறைமுகத்தை தேடு" },
  te: { yourLocation: "మీ స్థానం", useGps: "నా స్థానాన్ని ఉపయోగించండి", locating: "వెతుకుతోంది…", denied: "స్థానం బ్లాక్ చేయబడింది — రేవును ఎంచుకోండి", unavailable: "స్థానం అందుబాటులో లేదు — రేవును ఎంచుకోండి", pickPort: "రేవును ఎంచుకోండి", tapMap: "మ్యాప్‌లో ఎక్కడైనా నొక్కవచ్చు", gps: "GPS", search: "రేవును శోధించండి" },
  bn: { yourLocation: "আপনার অবস্থান", useGps: "আমার অবস্থান ব্যবহার করুন", locating: "খুঁজছে…", denied: "অবস্থান অবরুদ্ধ — বন্দর বেছে নিন", unavailable: "অবস্থান উপলব্ধ নেই — বন্দর বেছে নিন", pickPort: "বন্দর বেছে নিন", tapMap: "মানচিত্রে যেকোনো জায়গায় ট্যাপ করতে পারেন", gps: "GPS", search: "বন্দর খুঁজুন" },
  ml: { yourLocation: "നിങ്ങളുടെ സ്ഥാനം", useGps: "എന്റെ സ്ഥാനം ഉപയോഗിക്കുക", locating: "തിരയുന്നു…", denied: "സ്ഥാനം തടഞ്ഞു — തുറമുഖം തിരഞ്ഞെടുക്കൂ", unavailable: "സ്ഥാനം ലഭ്യമല്ല — തുറമുഖം തിരഞ്ഞെടുക്കൂ", pickPort: "തുറമുഖം തിരഞ്ഞെടുക്കൂ", tapMap: "മാപ്പിൽ എവിടെ വേണമെങ്കിലും ടാപ്പുചെയ്യാം", gps: "GPS", search: "തുറമുഖം തിരയൂ" },
};

export default function LocationPicker({
  current,
  language = "en",
  onPick,
  compact = false,
}: {
  current: PickedLocation | null;
  language?: Language;
  /** Floating glass pill that sits on top of the map. */
  compact?: boolean;
  onPick: (loc: PickedLocation) => void;
}) {
  const t = T[language] ?? T.en;
  const [status, setStatus] = useState<"idle" | "locating" | "denied" | "error">("idle");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const useGps = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("idle");
        onPick({
          latitude: +pos.coords.latitude.toFixed(4),
          longitude: +pos.coords.longitude.toFixed(4),
          label: t.yourLocation,
          source: "gps",
        });
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const matches = query
    ? PORTS.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.state.toLowerCase().includes(query.toLowerCase()),
      )
    : PORTS;

  return (
    <div
      ref={boxRef}
      className={compact ? "glass-pill loc-pill relative z-[600] px-3 py-1.5" : "panel relative z-[600] px-4 py-3"}
    >
      <div className={compact ? "flex flex-nowrap items-center gap-2" : "flex flex-wrap items-center gap-x-3 gap-y-2"}>
        <div className="min-w-0 flex-1">
          {!compact && <div className="label">{t.yourLocation}</div>}
          <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
            <span
              title={current?.label}
              className={`font-display font-bold leading-tight text-ink-900 ${
                compact ? "min-w-[4.5rem] max-w-[11rem] truncate text-[15px]" : "truncate text-[18px]"
              }`}
            >
              {(current?.source === "port" ? PORT_NAMES[language]?.[current.label] : null) ?? current?.label ?? "—"}
            </span>
            {current?.source === "gps" && (
              <span className="shrink-0 border border-risk-low/70 px-1.5 py-px font-mono text-[8.5px] font-bold uppercase tracking-wider text-risk-low">
                {t.gps}
              </span>
            )}
            {current && (
              <span className={`truncate font-mono text-[10.5px] tabular-nums text-ink-400 ${compact ? "hidden min-[1500px]:inline" : "shrink-0"}`}>
                {current.latitude.toFixed(3)}°N, {current.longitude.toFixed(3)}°E
              </span>
            )}
          </div>
        </div>

        <button
          onClick={useGps}
          disabled={status === "locating"}
          title={t.useGps}
          aria-label={t.useGps}
          className="btn-line shrink-0 whitespace-nowrap !py-1.5 disabled:opacity-55"
        >
          <CrosshairGlyph size={13} className={status === "locating" ? "animate-spin" : ""} />
          <span className={compact ? "hidden min-[1280px]:inline" : ""}>
            {status === "locating" ? t.locating : t.useGps}
          </span>
        </button>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`btn-line shrink-0 whitespace-nowrap !py-1.5 ${open ? "!bg-ink-900 !text-paper-50" : ""}`}
        >
          {t.pickPort}
          <span className={`inline-block transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
      </div>

      {(status === "denied" || status === "error") && (
        <p className="mt-2 text-[11.5px] font-medium text-risk-high">
          {status === "denied" ? t.denied : t.unavailable}
        </p>
      )}
      {!compact && <p className="mt-1.5 text-[10.5px] italic text-ink-400">{t.tapMap}</p>}

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-[700] mt-2 overflow-hidden rounded-[10px] border shadow-xl"
          style={{ borderColor: "var(--rule-strong)", background: "var(--paper-bright)" }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="w-full border-b bg-transparent px-4 py-3 text-[13px] text-ink-800 outline-none placeholder:text-ink-300"
            style={{ borderColor: "var(--rule)" }}
          />
          <div className="max-h-64 overflow-y-auto py-1">
            {matches.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  onPick({
                    latitude: p.lat,
                    longitude: p.lon,
                    label: p.name,
                    source: "port",
                  });
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-baseline gap-2 border-b px-4 py-2.5 text-left transition last:border-0 hover:bg-paper-150"
                style={{ borderColor: "var(--rule-faint)" }}
              >
                <span className="text-[13px] font-semibold text-ink-900">{PORT_NAMES[language]?.[p.name] || p.name}</span>
                <span className="text-[11px] text-ink-400">{p.state}</span>
                <span className="ml-auto font-mono text-[9.5px] tabular-nums text-ink-300">
                  {p.lat.toFixed(2)}°N {p.lon.toFixed(2)}°E
                </span>
              </button>
            ))}
            {!matches.length && <div className="px-4 py-3 text-[12px] text-ink-400">—</div>}
          </div>
        </div>
      )}
    </div>
  );
}
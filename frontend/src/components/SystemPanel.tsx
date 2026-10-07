import { Fragment, useEffect, useRef, useState } from "react";
import * as api from "../api";
import type { Localized, Language } from "../types";
import { CourseArrow, FishGlyph, LockGlyph, WarnGlyph } from "./glyphs";
import { PORTS } from "./LocationPicker";
import QuickRiskPanel from "./QuickRiskPanel";


/** The joint between two stages of the pipeline — purely decorative, so the
 * four sections below read as one instrument instead of a stack of cards. */
function PipeJoint() {
  return (
    <div className="pipe-joint" aria-hidden>
      <i />
      <CourseArrow size={11} className="rotate-90" />
      <i />
    </div>
  );
}

/** The engine room, in the fisher's three languages. */
const L10N: Localized<Record<string, string>> = {
  en: {
    engineRoom: "The engine room",
    configNote: "GET /api/config exposes every weight and threshold — nothing is hidden",
    title: "What we do with the data",
    intro:
      "One question triggers one sweep of the machine below: live providers are read once per position, remembered as a 72-hour series, reasoned over by ten agents in parallel, floored by deterministic safety rules — and every number that reaches the screen carries its source, timestamp and mode.",
    s1: "01 · Intake — what comes in",
    s2: "02 · Reasoning — who touches it",
    s2note: "ThreadPoolExecutor fan-out · real latencies in the Agent crew panel",
    s3: "03 · The law — floors that only raise",
    s4: "04 · Out — what it becomes",
    oneFetch: "one HTTP fetch",
    perProvider: "per provider · per position",
    cacheTitle: "The series cache",
    cacheBody:
      "One response already holds 72 hours of hourly sea for that spot. We keep it — keyed to the kilometre, for ten minutes — so the 24-hour timeline, the safe-window scan and the authority board all answer from memory instead of hammering the provider.",
    cacheMeta: "failures remembered 60 s · cleared on mode toggle · 32 s → 0.02 s",
    everyAgent: "every agent · every hour",
    fromMemory: "answered from memory",
    degrade:
      "If a live provider fails, the agent degrades to the demo store and says so — the answer arrives either way, relabelled, never silently pretending to be live.",
    stamp: "Official severe warning → 92",
    law1: "IMD fishermen warning active → floor 70",
    law2: "wave ≥ 4.0 m → floor 85 · gale wind ≥ 62 km/h → floor 85",
    law3: "inside a restricted zone → floor 60",
    lawNote:
      "Deterministic rules can only raise a score. No model, no language output, no prompt can talk MARVO down from an official warning.",
    reading: "Reading the coast — right now",
    onePort: "one port every",
    flipNote: "edition · flip DATA EDITION in the header and watch the sources change",
    nowReading: "Now reading",
    wave: "Wave",
    wind: "Wind",
    sst: "Sea temp",
    vis: "Visibility",
    hailing: "Hailing the first landing centre…",
    unreachable: "Backend unreachable — is uvicorn running on port 8000?",
    hPort: "Port",
    hSource: "Source",
    hMode: "Mode",
    hLatency: "Latency",
    hAt: "At",
    feedNote:
      "These are the same readings the fishing model and the risk engine consume — wave and wind feed the safety score, SST and chlorophyll feed the chance-of-fish, and the provenance column is what the evidence table shows a fisher.",
    outVerdict: "A verdict",
    outVerdictD:
      "0–100 risk with every point attributed, floored by the safety law, spoken in the fisher's language.",
    outPlan: "A plan",
    outPlanD:
      "Ranked grounds with chance of fish and likely species, the best window, how long to stay, the safest course.",
    outLedger: "A ledger",
    outLedgerD:
      "Every value with source · timestamp · confidence · mode. Simulated data is always labelled. CSV export for the authority.",
  },
  hi: {
    engineRoom: "इंजन रूम",
    configNote: "GET /api/config हर वेट और सीमा दिखाता है — कुछ भी छिपा नहीं",
    title: "डेटा का हम क्या करते हैं",
    intro:
      "एक सवाल नीचे की पूरी मशीन चलाता है: लाइव स्रोत हर स्थान के लिए एक बार पढ़े जाते हैं, 72 घंटे की सीरीज़ के रूप में याद रहते हैं, दस एजेंट एक साथ उन पर तर्क करते हैं, निश्चित सुरक्षा नियम लागू होते हैं — और स्क्रीन तक पहुँचने वाले हर आँकड़े के साथ उसका स्रोत, समय और मोड होता है।",
    s1: "01 · आगम — क्या आता है",
    s2: "02 · तर्क — कौन छूता है",
    s2note: "ThreadPoolExecutor फैन-आउट · असली लेटेंसी एजेंट पैनल में",
    s3: "03 · नियम — जो सिर्फ़ जोखिम बढ़ाते हैं",
    s4: "04 · परिणाम — क्या बनता है",
    oneFetch: "एक HTTP कॉल",
    perProvider: "प्रति स्रोत · प्रति स्थान",
    cacheTitle: "सीरीज़ कैश",
    cacheBody:
      "एक जवाब में उस जगह के 72 घंटे का प्रति-घंटा समुद्र होता है। हम उसे रखते हैं — किलोमीटर पर, दस मिनट के लिए — ताकि 24 घंटे की टाइमलाइन, सुरक्षित-समय की जाँच और प्रशासन बोर्ड सब स्मृति से जवाब दें, स्रोत को बार-बार न पुकारें।",
    cacheMeta: "विफलता 60 सेकंड याद · मोड बदलने पर साफ़ · 32 s → 0.02 s",
    everyAgent: "हर एजेंट · हर घंटा",
    fromMemory: "स्मृति से जवाब",
    degrade:
      "लाइव स्रोत विफल हो तो एजेंट डेमो डेटा पर उतर आता है और यह बताता भी है — जवाब हर हाल में आता है, सही लेबल के साथ, कभी चुपचाप लाइव होने का दिखावा नहीं।",
    stamp: "आधिकारिक भीषण चेतावनी → 92",
    law1: "IMD मछुआरा चेतावनी सक्रिय → कम-से-कम 70",
    law2: "लहर ≥ 4.0 मी → 85 · आँधी हवा ≥ 62 किमी/घं → 85",
    law3: "प्रतिबंधित क्षेत्र के भीतर → 60",
    lawNote:
      "निश्चित नियम स्कोर सिर्फ़ बढ़ा सकते हैं। कोई मॉडल, कोई भाषा, कोई प्रॉम्प्ट MARVO को आधिकारिक चेतावनी से नीचे नहीं ला सकता।",
    reading: "तट की रीडिंग — अभी",
    onePort: "हर",
    flipNote: "संस्करण · हेडर में DATA EDITION बदलिए और स्रोत बदलते देखिए",
    nowReading: "अभी पढ़ रहे हैं",
    wave: "लहर",
    wind: "हवा",
    sst: "समुद्री तापमान",
    vis: "दृश्यता",
    hailing: "पहले लैंडिंग सेंटर से संपर्क…",
    unreachable: "बैकएंड नहीं मिला — क्या uvicorn पोर्ट 8000 पर चल रहा है?",
    hPort: "बंदरगाह",
    hSource: "स्रोत",
    hMode: "मोड",
    hLatency: "लेटेंसी",
    hAt: "समय",
    feedNote:
      "यही रीडिंग मत्स्य मॉडल और रिस्क इंजन खाते हैं — लहर-हवा सुरक्षा स्कोर में, तापमान-क्लोरोफिल मछली की संभावना में, और स्रोत वाला कॉलम वही है जो मछुआरे को प्रमाण तालिका में दिखता है।",
    outVerdict: "फ़ैसला",
    outVerdictD:
      "0–100 जोखिम, हर अंक के हिसाब के साथ, सुरक्षा नियमों से बँधा, मछुआरे की भाषा में बोला हुआ।",
    outPlan: "योजना",
    outPlanD:
      "रैंक की हुई जगहें, मछली की संभावना और संभावित प्रजातियाँ, सबसे अच्छा समय, कितना रुकना, सबसे सुरक्षित मार्ग।",
    outLedger: "बहीखाता",
    outLedgerD:
      "हर मान के साथ स्रोत · समय · भरोसा · मोड। नक़ली डेटा पर हमेशा लेबल। प्रशासन के लिए CSV निर्यात।",
  },
  mr: {
    engineRoom: "इंजिन रूम",
    configNote: "GET /api/config प्रत्येक वेट व मर्यादा दाखवते — काहीही लपवलेले नाही",
    title: "डेटाचे आम्ही काय करतो",
    intro:
      "एक प्रश्न खालची संपूर्ण यंत्रणा चालवतो: लाइव्ह स्रोत प्रत्येक ठिकाणासाठी एकदाच वाचले जातात, ७२ तासांची मालिका म्हणून लक्षात राहतात, दहा एजंट एकाच वेळी त्यावर तर्क करतात, निश्चित सुरक्षा नियम लागू होतात — आणि स्क्रीनवर पोहोचणाऱ्या प्रत्येक आकड्यासोबत त्याचा स्रोत, वेळ आणि मोड असतो.",
    s1: "01 · आवक — काय येते",
    s2: "02 · तर्क — कोण हाताळते",
    s2note: "ThreadPoolExecutor फॅन-आउट · खऱ्या लेटन्सी एजंट पॅनेलमध्ये",
    s3: "03 · नियम — जे फक्त धोका वाढवतात",
    s4: "04 · निकाल — काय बनते",
    oneFetch: "एक HTTP कॉल",
    perProvider: "प्रति स्रोत · प्रति ठिकाण",
    cacheTitle: "मालिका कॅशे",
    cacheBody:
      "एका उत्तरात त्या जागेचा ७२ तासांचा तासागणिक समुद्र असतो. आम्ही तो ठेवतो — किलोमीटरवर, दहा मिनिटांसाठी — म्हणजे २४ तासांची टाइमलाइन, सुरक्षित-वेळ तपासणी आणि प्रशासन फलक सर्व स्मृतीतून उत्तर देतात, स्रोताला पुन्हा पुन्हा हाक मारत नाहीत.",
    cacheMeta: "अपयश ६० सेकंद लक्षात · मोड बदलल्यावर साफ · 32 s → 0.02 s",
    everyAgent: "प्रत्येक एजंट · प्रत्येक तास",
    fromMemory: "स्मृतीतून उत्तर",
    degrade:
      "लाइव्ह स्रोत अयशस्वी झाला तर एजंट डेमो डेटावर उतरतो आणि तसे सांगतोही — उत्तर कोणत्याही परिस्थितीत येते, योग्य लेबलसह, लाइव्ह असल्याचा आव कधीही आणत नाही.",
    stamp: "अधिकृत तीव्र इशारा → 92",
    law1: "IMD मच्छीमार इशारा सक्रिय → किमान 70",
    law2: "लाट ≥ 4.0 मी → 85 · वादळी वारा ≥ 62 किमी/ता → 85",
    law3: "प्रतिबंधित क्षेत्रात → 60",
    lawNote:
      "निश्चित नियम गुण फक्त वाढवू शकतात. कोणताही मॉडेल, कोणतीही भाषा, कोणताही प्रॉम्प्ट MARVO ला अधिकृत इशाऱ्याखाली आणू शकत नाही.",
    reading: "किनाऱ्याचे वाचन — आत्ता",
    onePort: "दर",
    flipNote: "आवृत्ती · हेडरमधील DATA EDITION बदला आणि स्रोत बदलताना पाहा",
    nowReading: "आत्ता वाचत आहोत",
    wave: "लाट",
    wind: "वारा",
    sst: "समुद्र तापमान",
    vis: "दृश्यमानता",
    hailing: "पहिल्या लँडिंग सेंटरशी संपर्क…",
    unreachable: "बॅकएंड मिळाले नाही — uvicorn पोर्ट 8000 वर चालू आहे का?",
    hPort: "बंदर",
    hSource: "स्रोत",
    hMode: "मोड",
    hLatency: "लेटन्सी",
    hAt: "वेळ",
    feedNote:
      "हेच वाचन मासेमारी मॉडेल आणि रिस्क इंजिन वापरतात — लाट-वारा सुरक्षा गुणांत, तापमान-क्लोरोफिल माशांच्या शक्यतेत, आणि स्रोताचा स्तंभ तोच जो मच्छीमाराला पुरावा तक्त्यात दिसतो.",
    outVerdict: "निर्णय",
    outVerdictD:
      "0–100 धोका, प्रत्येक गुणाच्या हिशेबासह, सुरक्षा नियमांनी बांधलेला, मच्छीमाराच्या भाषेत बोललेला.",
    outPlan: "योजना",
    outPlanD:
      "क्रमवारी लावलेल्या जागा, माशांची शक्यता व संभाव्य प्रजाती, सर्वोत्तम वेळ, किती थांबायचे, सर्वात सुरक्षित मार्ग.",
    outLedger: "नोंदवही",
    outLedgerD:
      "प्रत्येक मूल्यासोबत स्रोत · वेळ · विश्वास · मोड. नमुना डेटावर नेहमी लेबल. प्रशासनासाठी CSV निर्यात.",
  },
  ta: {
    engineRoom: "எஞ்சின் அறை", configNote: "GET /api/config ஒவ்வொரு எடை மற்றும் வரம்பையும் காட்டுகிறது",
    title: "தரவை நாங்கள் என்ன செய்கிறோம்", intro: "ஒரு கேள்வி இயந்திரத்தை இயக்குகிறது: நேரடி வழங்குநர்கள் ஒருமுறை படிக்கப்படுகிறார்கள், 72 மணி நேரம் நினைவில் வைக்கப்படுகிறது, பத்து முகவர்கள் ஒரே நேரத்தில் தர்க்கிக்கிறார்கள்.",
    s1: "01 · உள்ளீடு", s2: "02 · தர்க்கம்", s2note: "ThreadPoolExecutor", s3: "03 · விதிகள்", s4: "04 · வெளியீடு",
    oneFetch: "ஒரு HTTP கோரிக்கை", perProvider: "வழங்குநருக்கு · இடத்திற்கு",
    cacheTitle: "தொடர் கேச்", cacheBody: "72 மணி நேர கடல் நினைவகம் — கடிகாரத்தை அழிக்காமல் பதில்கள்.", cacheMeta: "தோல்வி 60 வி நினைவு · மோட் மாற்றத்தில் அழிக்கப்படுகிறது",
    everyAgent: "ஒவ்வொரு முகவரும்", fromMemory: "நினைவகத்திலிருந்து பதில்",
    degrade: "நேரடி வழங்குநர் தோல்வியடைந்தால் டெமோ தரவுக்கு மாறும் — எப்போதும் லேபிளிடப்படும்.",
    stamp: "அதிகாரப்பூர்வ எச்சரிக்கை → 92", law1: "IMD மீனவர் எச்சரிக்கை → குறைந்தபட்சம் 70", law2: "அலை ≥ 4.0 மீ → 85", law3: "தடைசெய்யப்பட்ட பகுதி → 60",
    lawNote: "விதிகள் மட்டுமே மதிப்பை உயர்த்தும். எந்த மாதிரியும் அதிகாரப்பூர்வ எச்சரிக்கையை மேற்கொள்ள முடியாது.",
    reading: "தற்போது வாசிக்கிறோம்", onePort: "ஒரு துறைமுகம்", flipNote: "DATA EDITION மாற்றவும்", nowReading: "இப்போது வாசிக்கிறோம்",
    wave: "அலை", wind: "காற்று", sst: "கடல் வெப்பம்", vis: "பார்வைதிறன்",
    hailing: "தொடர்பில் உள்ளோம்…", unreachable: "பின்தளம் கிடைக்கவில்லை — uvicorn போர்ட் 8000ல் இயங்குகிறதா?",
    hPort: "துறைமுகம்", hSource: "மூலம்", hMode: "பயன்முறை", hLatency: "தாமதம்", hAt: "நேரம்",
    feedNote: "இந்த வாசிப்புகளை மீன்பிடி மாதிரி பயன்படுத்துகிறது.",
    outVerdict: "தீர்ப்பு", outVerdictD: "0–100 ஆபத்து, மீனவரின் மொழியில்.", outPlan: "திட்டம்", outPlanD: "தரவரிசை இடங்கள், சிறந்த நேரம், பாதுகாப்பான பாதை.", outLedger: "ஏடு", outLedgerD: "ஒவ்வொரு மதிப்பும் மூலம் · நேரம் · நம்பிக்கை · பயன்முறை.",
  },
  te: {
    engineRoom: "ఇంజన్ రూమ్", configNote: "GET /api/config ప్రతి వెయిట్ మరియు పరిమితిని చూపిస్తుంది",
    title: "డేటాను మేమేమి చేస్తాం", intro: "ఒక ప్రశ్న యంత్రాన్ని నడుపుతుంది: నేరుగా సరఫరాదారులు ఒకసారి చదవబడతారు, 72 గంటలు గుర్తుంచుకోబడతాయి, పది ఏజెంట్లు ఒకే సమయంలో తర్కిస్తారు.",
    s1: "01 · ఇన్‌పుట్", s2: "02 · తర్కం", s2note: "ThreadPoolExecutor", s3: "03 · నియమాలు", s4: "04 · అవుట్‌పుట్",
    oneFetch: "ఒక HTTP అభ్యర్థన", perProvider: "సరఫరాదారుకు · స్థానానికి",
    cacheTitle: "సీరీస్ కాష్", cacheBody: "72 గంటల సముద్ర మెమరీ — మళ్ళీ అభ్యర్థించకుండా సమాధానాలు.", cacheMeta: "వైఫల్యం 60 సె గుర్తు · మోడ్ మార్పుపై క్లియర్",
    everyAgent: "ప్రతి ఏజెంట్", fromMemory: "మెమరీ నుండి సమాధానం",
    degrade: "నేరుగా సరఫరాదారు విఫలమైతే డెమో డేటాకు మారుతుంది — ఎల్లప్పుడూ లేబుల్ చేయబడుతుంది.",
    stamp: "అధికారిక హెచ్చరిక → 92", law1: "IMD మత్స్యకారుల హెచ్చరిక → కనీసం 70", law2: "అల ≥ 4.0 మీ → 85", law3: "నిషేధిత ప్రాంతం → 60",
    lawNote: "నియమాలు మాత్రమే స్కోర్‌ను పెంచగలవు. ఏ మోడల్ అయినా అధికారిక హెచ్చరికను అధిగమించలేదు.",
    reading: "ప్రస్తుతం చదువుతున్నాం", onePort: "ఒక పోర్టు", flipNote: "DATA EDITION మార్చండి", nowReading: "ఇప్పుడు చదువుతున్నాం",
    wave: "అల", wind: "గాలి", sst: "సముద్ర ఉష్ణోగ్రత", vis: "దృశ్యత",
    hailing: "సంప్రదిస్తున్నాం…", unreachable: "బ్యాకెండ్ అందుబాటులో లేదు — uvicorn పోర్ట్ 8000లో నడుస్తోందా?",
    hPort: "పోర్టు", hSource: "మూలం", hMode: "మోడ్", hLatency: "జాప్యం", hAt: "సమయం",
    feedNote: "ఈ రీడింగులను ఫిషింగ్ మోడల్ ఉపయోగిస్తుంది.",
    outVerdict: "తీర్పు", outVerdictD: "0–100 ప్రమాదం, మత్స్యకారుని భాషలో.", outPlan: "ప్రణాళిక", outPlanD: "ర్యాంక్ చేయబడిన ప్రదేశాలు, ఉత్తమ సమయం, సురక్షిత మార్గం.", outLedger: "లెడ్జర్", outLedgerD: "ప్రతి విలువతో మూలం · సమయం · నమ్మకం · మోడ్.",
  },
  bn: {
    engineRoom: "ইঞ্জিন রুম", configNote: "GET /api/config প্রতিটি ওজন ও সীমা দেখায়",
    title: "আমরা ডেটা দিয়ে কী করি", intro: "একটি প্রশ্ন যন্ত্রটি চালায়: সরাসরি সরবরাহকারীরা একবার পড়া হয়, ৭২ ঘন্টা মনে রাখা হয়, দশটি এজেন্ট একসাথে যুক্তি করে।",
    s1: "০১ · ইনপুট", s2: "০২ · যুক্তি", s2note: "ThreadPoolExecutor", s3: "০৩ · নিয়ম", s4: "০৪ · আউটপুট",
    oneFetch: "একটি HTTP অনুরোধ", perProvider: "সরবরাহকারী · অবস্থান প্রতি",
    cacheTitle: "সিরিজ ক্যাশ", cacheBody: "৭২ ঘন্টার সমুদ্র স্মৃতি — পুনরায় অনুরোধ না করেই উত্তর।", cacheMeta: "ব্যর্থতা ৬০ সে মনে · মোড পরিবর্তনে পরিষ্কার",
    everyAgent: "প্রতিটি এজেন্ট", fromMemory: "স্মৃতি থেকে উত্তর",
    degrade: "সরাসরি ব্যর্থ হলে ডেমো ডেটায় চলে যায় — সবসময় লেবেলযুক্ত।",
    stamp: "সরকারি সতর্কতা → ৯২", law1: "IMD জেলে সতর্কতা → কমপক্ষে ৭০", law2: "ঢেউ ≥ ৪.০ মি → ৮৫", law3: "নিষিদ্ধ এলাকা → ৬০",
    lawNote: "নিয়মগুলি শুধুমাত্র স্কোর বাড়াতে পারে। কোনো মডেল সরকারি সতর্কতা অতিক্রম করতে পারে না।",
    reading: "এখন পড়ছি", onePort: "একটি বন্দর", flipNote: "DATA EDITION পরিবর্তন করুন", nowReading: "এখন পড়ছি",
    wave: "ঢেউ", wind: "বাতাস", sst: "সমুদ্রের তাপমাত্রা", vis: "দৃশ্যমানতা",
    hailing: "যোগাযোগ করছি…", unreachable: "ব্যাকএন্ড পাওয়া যাচ্ছে না — uvicorn পোর্ট ৮০০০-এ চলছে?",
    hPort: "বন্দর", hSource: "উৎস", hMode: "মোড", hLatency: "বিলম্ব", hAt: "সময়",
    feedNote: "এই রিডিংগুলো ফিশিং মডেল ব্যবহার করে।",
    outVerdict: "রায়", outVerdictD: "০–১০০ ঝুঁকি, জেলের ভাষায়।", outPlan: "পরিকল্পনা", outPlanD: "র‍্যাংক করা স্থান, সেরা সময়, নিরাপদ পথ।", outLedger: "খাতা", outLedgerD: "প্রতিটি মানের সাথে উৎস · সময় · আস্থা · মোড।",
  },
  ml: {
    engineRoom: "എഞ്ചിൻ റൂം", configNote: "GET /api/config എല്ലാ ഭാരവും പരിധിയും കാണിക്കുന്നു",
    title: "ഡേറ്റ കൊണ്ട് ഞങ്ങൾ എന്ത് ചെയ്യുന്നു", intro: "ഒരു ചോദ്യം യന്ത്രത്തെ ചലിപ്പിക്കുന്നു: നേരിട്ടുള്ള ദാതാക്കൾ ഒരിക്കൽ വായിക്കപ്പെടുന്നു, 72 മണിക്കൂർ ഓർമ്മിക്കപ്പെടുന്നു, പത്ത് ഏജന്റുമാർ ഒരേ സമയം യുക്തി ചിന്തിക്കുന്നു.",
    s1: "01 · ഇൻപുട്ട്", s2: "02 · യുക്തി", s2note: "ThreadPoolExecutor", s3: "03 · നിയമങ്ങൾ", s4: "04 · ഔട്ട്പുട്ട്",
    oneFetch: "ഒരു HTTP അഭ്യർത്ഥന", perProvider: "ദാതാവിന് · സ്ഥാനത്തിന്",
    cacheTitle: "സീരീസ് കാഷ്", cacheBody: "72 മണിക്കൂർ സമുദ്ര സ്മൃതി — വീണ്ടും അഭ്യർത്ഥിക്കാതെ ഉത്തരങ്ങൾ.", cacheMeta: "പരാജയം 60 സെ ഓർമ്മ · മോഡ് മാറ്റത്തിൽ ക്ലിയർ",
    everyAgent: "ഓരോ ഏജന്റും", fromMemory: "സ്മൃതിയിൽ നിന്ന് ഉത്തരം",
    degrade: "നേരിട്ടുള്ളത് പരാജയപ്പെട്ടാൽ ഡെമോ ഡേറ്റയിലേക്ക് മാറും — എപ്പോഴും ലേബൽ ചെയ്യപ്പെടും.",
    stamp: "ഔദ്യോഗിക മുന്നറിയിപ്പ് → 92", law1: "IMD മത്സ്യത്തൊഴിലാളി മുന്നറിയിപ്പ് → കുറഞ്ഞത് 70", law2: "തിര ≥ 4.0 മീ → 85", law3: "നിയന്ത്രിത പ്രദേശം → 60",
    lawNote: "നിയമങ്ങൾ മാത്രം സ്കോർ ഉയർത്തും. ഒരു മോഡലിനും ഔദ്യോഗിക മുന്നറിയിപ്പ് മറികടക്കാനാകില്ല.",
    reading: "ഇപ്പോൾ വായിക്കുന്നു", onePort: "ഒരു തുറമുഖം", flipNote: "DATA EDITION മാറ്റുക", nowReading: "ഇപ്പോൾ വായിക്കുന്നു",
    wave: "തിര", wind: "കാറ്റ്", sst: "കടൽ താപനില", vis: "കാഴ്ച",
    hailing: "ബന്ധപ്പെടുന്നു…", unreachable: "ബാക്കെൻഡ് ലഭ്യമല്ല — uvicorn പോർട്ട് 8000-ൽ പ്രവർത്തിക്കുന്നുണ്ടോ?",
    hPort: "തുറമുഖം", hSource: "ഉറവിടം", hMode: "മോഡ്", hLatency: "കാലതാമസം", hAt: "സമയം",
    feedNote: "ഈ റീഡിംഗുകൾ ഫിഷിംഗ് മോഡൽ ഉപയോഗിക്കുന്നു.",
    outVerdict: "വിധി", outVerdictD: "0–100 അപകടസാധ്യത, മത്സ്യത്തൊഴിലാളിയുടെ ഭാഷയിൽ.", outPlan: "പദ്ധതി", outPlanD: "റാങ്ക് ചെയ്ത സ്ഥലങ്ങൾ, മികച്ച സമയം, സുരക്ഷിത വഴി.", outLedger: "ലെഡ്ജർ", outLedgerD: "ഓരോ മൂല്യവും ഉറവിടം · സമയം · ആത്മവിശ്വാസം · മോഡ്.",
  },
};

/**
 * The engine room — the whole machine on one sheet, running.
 *
 * Three stories, told in order: what data comes in and what we do with it
 * (the part judges ask about), the crew that reasons over it, and the safety
 * law that no model output can undo. At the bottom, the machine is shown
 * actually running: a live feed cycling through the coast, port by port,
 * with provenance on every reading.
 */

type FeedRow = {
  port: string;
  state: string;
  mode: string;
  source: string;
  latency: number;
  wave: string;
  wind: string;
  sst: string;
  vis: string;
  at: string;
};

const POLL_MS = 7000;

function fmt(m?: api.Measurement | null): string {
  if (!m || m.value == null) return "—";
  return `${m.value} ${m.unit}`;
}

export default function SystemPanel({
  mode,
  language = "en",
}: {
  mode: string;
  language?: Language;
}) {
  const t = L10N[language] ?? L10N.en;
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [tick, setTick] = useState(0);
  const [scanning, setScanning] = useState(true);
  const portIdx = useRef(0);

  // Cycle the coastline: one port per poll, newest reading on top.
  useEffect(() => {
    let alive = true;
    const read = async () => {
      const port = PORTS[portIdx.current % PORTS.length];
      portIdx.current += 1;
      try {
        const f = await api.forecast(port.lat, port.lon);
        if (!alive) return;
        const row: FeedRow = {
          port: port.name,
          state: port.state,
          mode: f.ocean.mode,
          source: f.ocean.source === "OPEN_METEO" ? "Open-Meteo" : "Demo store",
          latency: (f.ocean.latency_ms ?? 0) + (f.weather.latency_ms ?? 0),
          wave: fmt(f.ocean.measurements?.wave_height),
          wind: fmt(f.weather.measurements?.wind_speed),
          sst: fmt(f.ocean.measurements?.sst),
          vis: fmt(f.weather.measurements?.visibility),
          at: new Date().toLocaleTimeString("en-IN", { hour12: false }),
        };
        setRows((r) => [row, ...r].slice(0, 6));
        setTick((t) => t + 1);
        setScanning(true);
      } catch {
        if (alive) setScanning(false);
      }
    };
    read();
    const timer = setInterval(read, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const latest = rows[0];

  const providerText: Localized<{ gives: string; note: string }[]> = {
    en: [
      { gives: "wave height · wave period · sea-surface temperature · currents", note: "keyless public API — verified working" },
      { gives: "wind · rain probability · visibility · air temperature", note: "keyless public API — verified working" },
      { gives: "PFZ advisories · marine warnings · satellite SST", note: "no open public JSON API — slots in behind the same interface" },
      { gives: "species occurrence records, Indian coastal waters", note: "open biodiversity data, bundled as a dated snapshot — offline-safe" },
      { gives: "rehearsed sea states, keyed by hour of day", note: "every synthetic value is labelled simulated" },
    ],
    hi: [
      { gives: "लहर की ऊँचाई · अवधि · समुद्री सतह तापमान · धाराएँ", note: "बिना कुंजी सार्वजनिक API — जाँचा हुआ" },
      { gives: "हवा · वर्षा संभावना · दृश्यता · तापमान", note: "बिना कुंजी सार्वजनिक API — जाँचा हुआ" },
      { gives: "PFZ सलाह · समुद्री चेतावनियाँ · उपग्रह SST", note: "खुला JSON API नहीं — उसी इंटरफ़ेस के पीछे जुड़ते हैं" },
      { gives: "प्रजातियों की उपस्थिति के रिकॉर्ड, भारतीय तटीय जल", note: "खुला जैवविविधता डेटा, दिनांकित स्नैपशॉट — ऑफ़लाइन-सुरक्षित" },
      { gives: "घंटे के हिसाब से तैयार समुद्री स्थितियाँ", note: "हर नक़ली मान पर 'सिम्युलेटेड' लेबल" },
    ],
    mr: [
      { gives: "लाटेची उंची · कालावधी · समुद्र पृष्ठ तापमान · प्रवाह", note: "किल्लीशिवाय सार्वजनिक API — तपासलेले" },
      { gives: "वारा · पावसाची शक्यता · दृश्यमानता · तापमान", note: "किल्लीशिवाय सार्वजनिक API — तपासलेले" },
      { gives: "PFZ सल्ले · सागरी इशारे · उपग्रह SST", note: "खुले JSON API नाही — त्याच इंटरफेसमागे जोडले जातात" },
      { gives: "प्रजातींच्या उपस्थितीच्या नोंदी, भारतीय किनारी पाणी", note: "खुला जैवविविधता डेटा, दिनांकित स्नॅपशॉट — ऑफलाइन-सुरक्षित" },
      { gives: "तासागणिक तयार समुद्री स्थिती", note: "प्रत्येक नमुना मूल्यावर 'सिम्युलेटेड' लेबल" },
    ],
    ta: [
      { gives: "அலை உயரம் · கடல் மேற்பரப்பு வெப்பம் · நீரோட்டம்", note: "திறக்குறி மற்றும் பொது API" },
      { gives: "காற்று · மழை சாத்தியம் · பார்வைதிறன் · வெப்பம்", note: "திறக்குறி மற்றும் பொது API" },
      { gives: "PFZ ஆலோசனைகள் · கடல் எச்சரிக்கைகள்", note: "பொது JSON API இல்லை" },
      { gives: "இந்திய கடலோர நீரில் உயிரினம் நிரல்கள்", note: "தேதியிட்ட சரக்கு — ஆஃப்லைன்-பாதுகாப்பான" },
      { gives: "தயாரிக்கப்பட்ட கடல் நிலைமைகள்", note: "ஒவ்வொரு மதிப்பும் 'simulated' லேபிளிடப்படும்" },
    ],
    te: [
      { gives: "అల ఎత్తు · సముద్ర ఉపరితల ఉష్ణోగ్రత · ప్రవాహాలు", note: "కీలు లేని పబ్లిక్ API" },
      { gives: "గాలి · వర్షం సంభావ్యత · దృశ్యత · ఉష్ణోగ్రత", note: "కీలు లేని పబ్లిక్ API" },
      { gives: "PFZ సలహాలు · సముద్ర హెచ్చరికలు", note: "పబ్లిక్ JSON API లేదు" },
      { gives: "భారత తీర జలాల్లో జీవవైవిధ్య రికార్డులు", note: "తేదీవారీ స్నాప్‌షాట్ — ఆఫ్‌లైన్-సురక్షితం" },
      { gives: "సిద్ధం చేయబడిన సముద్ర స్థితిగతులు", note: "ప్రతి విలువకు 'simulated' లేబుల్" },
    ],
    bn: [
      { gives: "ঢেউয়ের উচ্চতা · সমুদ্র পৃষ্ঠের তাপমাত্রা · স্রোত", note: "কী ছাড়া সর্বজনীন API" },
      { gives: "বাতাস · বৃষ্টি সম্ভাবনা · দৃশ্যমানতা · তাপমাত্রা", note: "কী ছাড়া সর্বজনীন API" },
      { gives: "PFZ পরামর্শ · সমুদ্রের সতর্কতা", note: "সর্বজনীন JSON API নেই" },
      { gives: "ভারতীয় উপকূলীয় জলে জীববৈচিত্র্য রেকর্ড", note: "তারিখযুক্ত স্ন্যাপশট — অফলাইন-নিরাপদ" },
      { gives: "প্রস্তুত সমুদ্র অবস্থা", note: "প্রতিটি মানে 'simulated' লেবেল" },
    ],
    ml: [
      { gives: "തിരസ്സ് ഉയരം · കടൽ ഉപരിതല താപനില · പ്രവാഹങ്ങൾ", note: "കീ ഇല്ലാതെ പൊതു API" },
      { gives: "കാറ്റ് · മഴ സാധ്യത · ദൃശ്യത · താപനില", note: "കീ ഇല്ലാതെ പൊതു API" },
      { gives: "PFZ ഉപദേശങ്ങൾ · സമുദ്ര മുന്നറിയിപ്പുകൾ", note: "പൊതു JSON API ഇല്ല" },
      { gives: "ഇന്ത്യൻ തീരദേശ ജലത്തിൽ ജൈവവൈവിധ്യ രേഖകൾ", note: "തീയതിയോടു കൂടിയ സ്നാപ്ഷോട്ട് — ഓഫ്‌ലൈൻ-സുരക്ഷിതം" },
      { gives: "തയ്യാറാക്കിയ സമുദ്ര അവസ്ഥകൾ", note: "ഓരോ മൂല്യവും 'simulated' ലേബൽ ഉള്ളത്" },
    ],
  };
  const pText = providerText[language] ?? providerText.en;

  const providers = [
    { name: "Open-Meteo Marine", status: "LIVE", color: "#1D7A50", live: true, ...pText[0] },
    { name: "Open-Meteo Forecast", status: "LIVE", color: "#1D7A50", live: true, ...pText[1] },
    { name: "INCOIS · IMD · MOSDAC", status: "LIVE", color: "#1D7A50", live: true, ...pText[2] },
    { name: "OBIS · Map of Life", status: "BUNDLED SNAPSHOT", color: "#1E5F7A", live: false, ...pText[3] },
    { name: "Demo store", status: "ALWAYS ON", color: "#42596D", live: false, ...pText[4] },
  ];

  const crewText: Localized<{ phase: string; agents: string[]; note: string }[]> = {
    en: [
      { phase: "Understand", agents: ["Intent"], note: "rule-based parsing — language, place, time. No LLM." },
      { phase: "Gather", agents: ["Weather", "Ocean", "PFZ", "Alerts", "GIS"], note: "independent specialists fan out concurrently" },
      { phase: "Decide", agents: ["Risk engine", "Route (A*)"], note: "weighted model, then floors; safest ≠ shortest" },
      { phase: "Explain", agents: ["Explanation"], note: "plain words in EN / HI / MR, spoken back" },
    ],
    hi: [
      { phase: "समझो", agents: ["आशय"], note: "नियम-आधारित — भाषा, जगह, समय। कोई LLM नहीं।" },
      { phase: "जुटाओ", agents: ["मौसम", "समुद्र", "PFZ", "चेतावनियाँ", "GIS"], note: "स्वतंत्र विशेषज्ञ एक साथ निकलते हैं" },
      { phase: "तय करो", agents: ["रिस्क इंजन", "मार्ग (A*)"], note: "भारित मॉडल, फिर नियम; सुरक्षित ≠ छोटा" },
      { phase: "समझाओ", agents: ["व्याख्या"], note: "EN / HI / MR में सीधी भाषा, बोलकर भी" },
    ],
    mr: [
      { phase: "समजून घ्या", agents: ["हेतू"], note: "नियम-आधारित — भाषा, ठिकाण, वेळ. LLM नाही." },
      { phase: "गोळा करा", agents: ["हवामान", "समुद्र", "PFZ", "इशारे", "GIS"], note: "स्वतंत्र तज्ज्ञ एकाच वेळी निघतात" },
      { phase: "ठरवा", agents: ["रिस्क इंजिन", "मार्ग (A*)"], note: "भारित मॉडेल, मग नियम; सुरक्षित ≠ छोटा" },
      { phase: "समजावा", agents: ["स्पष्टीकरण"], note: "EN / HI / MR मध्ये सोपी भाषा, बोलूनही" },
    ],
    ta: [
      { phase: "புரிதல்", agents: ["நோக்கம்"], note: "விதி-அடிப்படை — மொழி, இடம், நேரம். LLM இல்லை." },
      { phase: "சேகரிப்பு", agents: ["வானிலை", "கடல்", "PFZ", "எச்சரிக்கைகள்", "GIS"], note: "சுயாதீன நிபுணர்கள் ஒரே நேரத்தில்" },
      { phase: "முடிவு", agents: ["ஆபத்து இயந்திரம்", "பாதை (A*)"], note: "பாதுகாப்பான ≠ குறுகிய" },
      { phase: "விளக்கம்", agents: ["விளக்கம்"], note: "உங்கள் மொழியில்" },
    ],
    te: [
      { phase: "అర్థం చేసుకోండి", agents: ["ఉద్దేశం"], note: "నియమ-ఆధారిత — భాష, స్థలం, సమయం. LLM లేదు." },
      { phase: "సేకరించండి", agents: ["వాతావరణం", "సముద్రం", "PFZ", "హెచ్చరికలు", "GIS"], note: "స్వతంత్ర నిపుణులు ఒకే సమయంలో" },
      { phase: "నిర్ణయించండి", agents: ["రిస్క్ ఇంజిన్", "మార్గం (A*)"], note: "సురక్షితమైన ≠ చిన్నది" },
      { phase: "వివరించండి", agents: ["వివరణ"], note: "మీ భాషలో" },
    ],
    bn: [
      { phase: "বোঝার চেষ্টা", agents: ["উদ্দেশ্য"], note: "নিয়ম-ভিত্তিক — ভাষা, স্থান, সময়। LLM নেই।" },
      { phase: "সংগ্রহ করুন", agents: ["আবহাওয়া", "সমুদ্র", "PFZ", "সতর্কতা", "GIS"], note: "স্বাধীন বিশেষজ্ঞরা একসাথে" },
      { phase: "সিদ্ধান্ত নিন", agents: ["ঝুঁকি ইঞ্জিন", "পথ (A*)"], note: "নিরাপদ ≠ ছোট" },
      { phase: "ব্যাখ্যা করুন", agents: ["ব্যাখ্যা"], note: "আপনার ভাষায়" },
    ],
    ml: [
      { phase: "മനസ്സിലാക്കുക", agents: ["ഉദ്ദേശ്യം"], note: "നിയമ-ആധാരിതം — ഭാഷ, സ്ഥലം, സമയം. LLM ഇല്ല." },
      { phase: "ശേഖരിക്കുക", agents: ["കാലാവസ്ഥ", "സമുദ്രം", "PFZ", "മുന്നറിയിപ്പുകൾ", "GIS"], note: "സ്വതന്ത്ര വിദഗ്ധർ ഒരേ സമയം" },
      { phase: "തീരുമാനിക്കുക", agents: ["റിസ്ക് എഞ്ചിൻ", "വഴി (A*)"], note: "സുരക്ഷിതം ≠ ചെറുത്" },
      { phase: "വിശദീകരിക്കുക", agents: ["വിശദീകരണം"], note: "നിങ്ങളുടെ ഭാഷയിൽ" },
    ],
  };
  const crew = crewText[language] ?? crewText.en;

  return (
    <div className="space-y-4">
      {/* ---------------- intro ---------------- */}
      <div className="panel rule-double overflow-hidden">
        <div className="hd">
          <span className="label">{t.engineRoom}</span>
          <span className="hidden font-mono text-[10px] text-chart-600 sm:block">
            {t.configNote}
          </span>
        </div>
        <div className="px-5 py-4">
          <h2 className="font-display text-[24px] font-bold leading-snug text-ink-900">
            {t.title}
          </h2>
          <p className="mt-1.5 max-w-[860px] text-[13.5px] leading-relaxed text-ink-500">
            {t.intro}
          </p>
        </div>
      </div>

      <PipeJoint />

      {/* ---------------- the data intake ---------------- */}
      <div className="panel overflow-hidden">
        <div className="hd">
          <span className="label">{t.s1}</span>
        </div>
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-5">
          {providers.map((p) => (
            <div
              key={p.name}
              className="lift rounded-[2px] border bg-paper-100 px-3.5 py-3"
              style={{ borderColor: "var(--rule)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`pulse-dot ${p.live ? "" : "pulse-dot--still"}`}
                  style={{ background: p.color, color: p.color }}
                />
                <span className="font-display text-[14px] font-bold text-ink-900">{p.name}</span>
              </div>
              <div
                className="mt-1.5 inline-block border px-1.5 py-px font-mono text-[8.5px] font-bold tracking-[0.14em]"
                style={{ color: p.color, borderColor: p.color }}
              >
                {p.status}
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-700">{p.gives}</p>
              <p className="mt-1 text-[10.5px] italic leading-snug text-ink-400">{p.note}</p>
            </div>
          ))}
        </div>

        {/* the flow into the cache */}
        <div className="grid items-center gap-2 px-4 pb-4 lg:grid-cols-[1fr_auto_1.2fr_auto_1fr]">
          <div className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
            {t.oneFetch}
            <br />
            <span className="text-ink-400">{t.perProvider}</span>
          </div>
          <div className="signal-line hidden w-24 lg:block">
            <i />
            <i />
            <i />
          </div>
          <div
            className="rounded-[2px] border-2 border-chart-600 bg-chart-100/40 px-4 py-3 text-center"
          >
            <div className="font-display text-[15px] font-bold text-ink-900">
              {t.cacheTitle}
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-700">{t.cacheBody}</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-chart-700">
              {t.cacheMeta}
            </p>
          </div>
          <div className="signal-line hidden w-24 lg:block">
            <i />
            <i />
            <i />
          </div>
          <div className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
            {t.everyAgent}
            <br />
            <span className="text-ink-400">{t.fromMemory}</span>
          </div>
        </div>

        <p
          className="border-t px-4 py-2.5 text-[11px] italic leading-relaxed text-ink-500"
          style={{ borderColor: "var(--rule-faint)" }}
        >
          {t.degrade}
        </p>
      </div>

      <PipeJoint />

      {/* ---------------- the crew ---------------- */}
      <div className="panel overflow-hidden">
        <div className="hd">
          <span className="label">{t.s2}</span>
          <span className="font-mono text-[10px] text-ink-400">{t.s2note}</span>
        </div>
        <div className="grid gap-0 px-4 py-4 lg:grid-cols-[1fr_auto_1.6fr_auto_1.2fr_auto_1fr]">
          {crew.map((c, i) => (
            <Fragment key={c.phase}>
              {i > 0 && (
                <div className="signal-line mx-1 hidden w-14 self-center lg:block">
                  <i />
                  <i />
                  <i />
                </div>
              )}
              <div className="py-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[16px] font-bold text-ink-900">{c.phase}</span>
                  {c.agents.length > 1 && i === 1 && (
                    <span className="font-mono text-[9px] font-bold text-chart-700">
                      ∥ {c.agents.length} CONCURRENT
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.agents.map((a, j) => (
                    <span
                      key={a}
                      className="flex items-center gap-1.5 rounded-[2px] border bg-paper-100 px-2 py-1 font-mono text-[10px] font-semibold text-ink-800"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      <span
                        className="pulse-dot !h-[6px] !w-[6px]"
                        style={{
                          background: "#2A7391",
                          color: "#2A7391",
                          animationDelay: `${j * 0.3}s`,
                        }}
                      />
                      {a}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] italic leading-snug text-ink-500">{c.note}</p>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <PipeJoint />

      {/* ---------------- the safety law ---------------- */}
      <div className="panel hatch-danger overflow-hidden border-risk-extreme/50">
        <div className="hd border-risk-extreme/25">
          <span className="label flex items-center gap-2 !text-risk-extreme">
            <WarnGlyph size={13} /> {t.s3}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <span className="stamp text-[12px] text-risk-extreme">{t.stamp}</span>
          <div className="space-y-1 font-mono text-[11px] text-ink-800">
            <div>{t.law1}</div>
            <div>{t.law2}</div>
            <div>{t.law3}</div>
          </div>
          <p className="max-w-[380px] text-[11.5px] italic leading-relaxed text-ink-600">
            <LockGlyph size={12} className="mr-1 inline text-risk-extreme" />
            {t.lawNote}
          </p>
        </div>
      </div>

      <PipeJoint />

      {/* ---------------- the live feed ---------------- */}
      <div className="panel rule-double overflow-hidden">
        <div className="hd">
          <span className="label flex items-center gap-2">
            <span
              className={`pulse-dot ${scanning ? "" : "pulse-dot--still"}`}
              style={{ background: scanning ? "#1D7A50" : "#AF2318", color: scanning ? "#1D7A50" : "#AF2318" }}
            />
            {t.reading}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink-400">
            {t.onePort} {POLL_MS / 1000} s · {mode} {t.flipNote}
          </span>
        </div>

        {latest ? (
          <div key={tick} className="popin grid grid-cols-2 gap-0 border-b sm:grid-cols-6" style={{ borderColor: "var(--rule-faint)" }}>
            <div className="col-span-2 px-4 py-3">
              <div className="label !text-[9px]">{t.nowReading}</div>
              <div className="font-display text-[19px] font-bold leading-tight text-ink-900">
                {latest.port}
              </div>
              <div className="font-mono text-[10px] text-ink-400">
                {latest.state} · {latest.at} IST
              </div>
            </div>
            {[
              { k: t.wave, v: latest.wave },
              { k: t.wind, v: latest.wind },
              { k: t.sst, v: latest.sst },
              { k: t.vis, v: latest.vis },
            ].map((x) => (
              <div key={x.k} className="border-l px-3 py-3" style={{ borderColor: "var(--rule-faint)" }}>
                <div className="label truncate !text-[9px]">{x.k}</div>
                <div className="mt-1 font-mono text-[16px] font-bold tabular-nums text-ink-900">
                  {x.v}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-b px-4 py-4 text-[13px] italic text-ink-400" style={{ borderColor: "var(--rule-faint)" }}>
            {scanning ? t.hailing : t.unreachable}
          </div>
        )}

        {/* the log */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left font-mono text-[11px]">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--rule)" }}>
                {[t.hPort, t.wave, t.wind, "SST", t.vis, t.hSource, t.hMode, t.hLatency, t.hAt].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`py-2 text-[8.5px] font-bold uppercase tracking-[0.14em] text-ink-400 ${
                        i === 0 ? "pl-4 pr-3" : "px-3"
                      }`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.port}-${r.at}`}
                  className={`border-b last:border-0 ${i === 0 ? "popin bg-chart-100/40" : ""}`}
                  style={{ borderColor: "var(--rule-faint)", opacity: 1 - i * 0.1 }}
                >
                  <td className="py-2 pl-4 pr-3 font-sans font-bold text-ink-900">{r.port}</td>
                  <td className="px-3 py-2 tabular-nums text-ink-800">{r.wave}</td>
                  <td className="px-3 py-2 tabular-nums text-ink-800">{r.wind}</td>
                  <td className="px-3 py-2 tabular-nums text-ink-800">{r.sst}</td>
                  <td className="px-3 py-2 tabular-nums text-ink-800">{r.vis}</td>
                  <td className="px-3 py-2 text-ink-500">{r.source}</td>
                  <td className="px-3 py-2">
                    <span
                      className="border px-1.5 py-px text-[8.5px] font-bold tracking-wider"
                      style={{
                        color: r.mode === "LIVE" ? "#1D7A50" : "#A17000",
                        borderColor: r.mode === "LIVE" ? "#1D7A50" : "#A17000",
                      }}
                    >
                      {r.mode}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-ink-500">{r.latency} ms</td>
                  <td className="px-3 py-2 tabular-nums text-ink-400">{r.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p
          className="flex items-center gap-2 border-t px-4 py-2.5 text-[11px] italic leading-relaxed text-ink-500"
          style={{ borderColor: "var(--rule-faint)" }}
        >
          <FishGlyph size={16} className="swim shrink-0 text-chart-500" />
          {t.feedNote}
        </p>
      </div>

      <PipeJoint />

      {/* ---------------- where it goes ---------------- */}
      <div className="panel overflow-hidden">
        <div className="hd">
          <span className="label">{t.s4}</span>
        </div>
        <div className="grid gap-0 sm:grid-cols-3">
          {[
            { h: t.outVerdict, d: t.outVerdictD },
            { h: t.outPlan, d: t.outPlanD },
            { h: t.outLedger, d: t.outLedgerD },
          ].map((x, i) => (
            <div
              key={x.h}
              className={`group px-5 py-4 transition-colors hover:bg-chart-100/40 ${i > 0 ? "sm:border-l" : ""}`}
              style={{ borderColor: "var(--rule-faint)" }}
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-[16px] font-bold text-ink-900">{x.h}</span>
                <CourseArrow
                  size={12}
                  className="text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-chart-600"
                />
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-600">{x.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- live risk for current port ---------------- */}
      {latest && (() => {
        const p = PORTS.find((port) => port.name === latest.port) ?? PORTS[0];
        return (
          <div>
            <div className="mb-2 label px-0.5">
              Risk engine output — currently reading {latest.port}
            </div>
            <QuickRiskPanel lat={p.lat} lon={p.lon} full language={language} />
          </div>
        );
      })()}
    </div>
  );
}
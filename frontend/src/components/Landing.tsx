import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowUp,
  Compass as CompassIcon,
  Layers,
  MessageCircle,
  Radar,
  Settings2,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import * as api from "../api";
import type { Language, Localized } from "../types";
import {
  CheckGlyph,
  CourseArrow,
  CrosshairGlyph,
  FishGlyph,
  GithubGlyph,
  LockGlyph,
  MicGlyph,
  PhoneGlyph,
  PlayGlyph,
  SchoolGlyph,
  SpeakerGlyph,
  WarnGlyph,
  WaveGlyph,
  WindGlyph,
} from "./glyphs";
import marvoLogo from "../marvo_logo.jpg";
import BrandLogo from "./BrandLogo";
import { HeroDemo, HeroSky } from "./HeroScene";

const FOOTER_PRODUCT_ICONS = [CompassIcon, MessageCircle, ShieldCheck, Settings2];
const FOOTER_EXPLORE_ICONS = [Layers, Workflow, Users, Radar];

const AGENT_ICONS = [
  CrosshairGlyph,
  SchoolGlyph,
  WarnGlyph,
  FishGlyph,
  CourseArrow,
  LockGlyph,
  SpeakerGlyph,
  MicGlyph,
  CheckGlyph,
];

const L10N: Localized<
  {
    tag1: string;
    tag2a: string;
    tag2b: string;
    tag2c: string;
    sub: string;
    kicker: string;
    navFeatures: string;
    navHow: string;
    navTry: string;
    ctaTour: string;
    ctaOpen: string;
    ctaPhone: string;
    ctaTry: string;
    openMarvo: string;
    openWord: string;
    watchLive: string;
    pipelineTitle: string;
    pipelineKicker: string;
    pipelineSub: string;
    stats: string[];
    cards: { kicker: string; title: string; lines: string[] }[];
    phases: { t: string; n: string }[];
    featuresKicker: string;
    featuresTitle: string;
    problemKicker: string;
    problemTitle: string;
    problemBody: string;
    problemTags: string[];
    problemQuestion: string;
    agentsKicker: string;
    agentsTitle: string;
    agentsSub: string;
    agents: { name: string; line: string }[];
    trustKicker: string;
    trustTitle: string;
    trustCards: { title: string; body: string }[];
    closingTitle: string;
    closingSub: string;
    footerTagline: string;
    footerProductHeading: string;
    footerExploreHeading: string;
    footerConnectHeading: string;
    footerSystemLabel: string;
    footerAgentsLabel: string;
    footerTrustLabel: string;
    footerTourLabel: string;
    footer: string;
  }
> = {
  en: {
    tag1: "Turn marine data into decisions.",
    tag2a: "Navigate with ",
    tag2b: "intelligence",
    tag2c: ".",
    sub: "MARVO brings together satellite, oceanographic, and weather data through collaborative AI agents to deliver clear, explainable insights and actionable recommendations for safer, smarter decisions at sea.",
    kicker: "SIH26176 · ISRO · Smart India Hackathon 2026",
    navFeatures: "Features",
    navHow: "How it works",
    navTry: "Try it",
    ctaTour: "Watch the guided tour",
    ctaOpen: "Open the MARVO app",
    ctaPhone: "Phone version",
    ctaTry: "Try a scenario → cyclone near Paradip",
    openMarvo: "Open MARVO",
    openWord: "Open",
    watchLive: "watch it run live →",
    featuresKicker: "What MARVO does",
    featuresTitle: "Three doors, one engine",
    problemKicker: "The problem",
    problemTitle: "Data everywhere. An answer nowhere.",
    problemBody:
      "Every day, satellites and weather stations generate oceans of sea-surface temperature, chlorophyll, and forecast data. But a fisherman deciding whether to sail at 6 AM has no way to ask a straight question and get a straight, trustworthy answer — until now.",
    problemTags: ["Satellite SST", "Chlorophyll bands", "IMD weather", "Coast Guard bulletins"],
    problemQuestion: "\"Can I go fishing tomorrow?\"",
    agentsKicker: "Ten agents, one decision",
    agentsTitle: "Meet the crew",
    agentsSub: "Every question fans out to specialists working at once — not one model guessing alone.",
    agents: [
      { name: "Intent Agent", line: "Parses any language query into a structured, actionable request" },
      { name: "Planner", line: "Fans out to all specialists concurrently and assembles the final response" },
      { name: "Weather Agent", line: "Fetches live wind, wave height, and swell from Open-Meteo" },
      { name: "Ocean Agent", line: "Reads SST and chlorophyll to score every fishing ground" },
      { name: "PFZ Agent", line: "Ranks potential fishing zones 0–100 and predicts likely species" },
      { name: "Cyclone Agent", line: "Tracks IMD cyclone and high-wave warnings in the region" },
      { name: "GIS Agent", line: "Runs point-in-polygon and route checks against real boundary data" },
      { name: "Risk Agent", line: "Weighs every factor into one 0–100 verdict with safety floors" },
      { name: "Route Agent", line: "Runs A* on a cost-weighted grid, rejects routes through restricted zones" },
      { name: "Explanation Agent", line: "Attaches a source, timestamp, and confidence to every number" },
    ],
    pipelineTitle: "How MARVO decides",
    pipelineKicker: "The differentiator",
    pipelineSub: "Four moves, every time — nothing skipped, nothing hidden.",
    trustKicker: "Trust & transparency",
    trustTitle: "Built to be trusted, not just clever",
    trustCards: [
      {
        title: "Official warnings always win",
        body: "If IMD, INCOIS, or the Coast Guard issue a warning, it overrides the model's verdict completely. No score outranks a human authority.",
      },
      {
        title: "Every number has a receipt",
        body: "Each reading carries its source, timestamp, and confidence — so nothing is a black box, and nothing is asserted without evidence.",
      },
      {
        title: "Built for who needs it most",
        body: "English, Hindi, and Marathi, spoken and typed — plus a one-tap voice readout for users who may read little.",
      },
    ],
    closingTitle: "See it decide, live.",
    closingSub: "No sign-up, no API key — open the app or watch the guided tour.",
    footerTagline: "Marine intelligence for safer days at sea.",
    footerProductHeading: "Product",
    footerExploreHeading: "Explore",
    footerConnectHeading: "Connect",
    footerSystemLabel: "System",
    footerAgentsLabel: "Agent crew",
    footerTrustLabel: "Trust",
    footerTourLabel: "Guided tour",
    stats: ["Agents in the crew", "Landing centres", "Official warnings", "Languages", "Data edition"],
    cards: [
      {
        kicker: "Today's plan",
        title: "Where the fish are",
        lines: [
          "Opens knowing where you are — reads 100 km of sea unprompted",
          "Every ground scored for chance of fish, with the why behind it",
          "Trip plan: when to go, how long to stay, what it should earn",
        ],
      },
      {
        kicker: "Ask MARVO",
        title: "Your language, spoken or typed",
        lines: [
          "English · हिंदी · मराठी — detected, never configured",
          "A 0–100 risk verdict where every point is attributed",
          "Official warnings override the model. Always.",
        ],
      },
      {
        kicker: "Authority",
        title: "The district view",
        lines: [
          "Every landing centre on the coast, scored by the same engine",
          "The administration sees the same evidence the fisher sees",
          "One-click CSV export for the day's advisory board",
        ],
      },
    ],
    phases: [
      { t: "Understand", n: "parse the question, any language" },
      { t: "Gather", n: "five specialists fan out concurrently" },
      { t: "Decide", n: "weighted model + safety floors that only raise" },
      { t: "Explain", n: "plain words, with sources, spoken back" },
    ],
    footer:
      "Demo / simulated data is always labelled · MARVO is decision support — never a replacement for an official advisory",
  },
  hi: {
    tag1: "समुद्री डेटा को फ़ैसलों में बदलें।",
    tag2a: "बुद्धिमत्ता के साथ ",
    tag2b: "नेविगेट करें",
    tag2c: "।",
    sub: "MARVO उपग्रह, समुद्री और मौसम डेटा को सहयोगी AI एजेंटों के ज़रिए जोड़कर, समुद्र में सुरक्षित और समझदार फ़ैसलों के लिए स्पष्ट, समझाने योग्य जानकारी और सुझाव देता है।",
    kicker: "SIH26176 · ISRO · स्मार्ट इंडिया हैकाथॉन 2026",
    navFeatures: "विशेषताएँ",
    navHow: "यह कैसे काम करता है",
    navTry: "आज़माएँ",
    ctaTour: "गाइडेड टूर देखें",
    ctaOpen: "MARVO ऐप खोलें",
    ctaPhone: "फ़ोन संस्करण",
    ctaTry: "एक परिदृश्य आज़माएँ → पारादीप के पास चक्रवात",
    openMarvo: "MARVO खोलें",
    openWord: "खोलें",
    watchLive: "इसे चलते हुए देखें →",
    featuresKicker: "MARVO क्या करता है",
    featuresTitle: "तीन दरवाज़े, एक इंजन",
    problemKicker: "समस्या",
    problemTitle: "डेटा हर जगह। जवाब कहीं नहीं।",
    problemBody:
      "हर दिन उपग्रह और मौसम केंद्र समुद्र सतह तापमान, क्लोरोफिल और पूर्वानुमान डेटा का समुंदर पैदा करते हैं। पर सुबह 6 बजे समुद्र में जाना है या नहीं, यह तय करने वाले मछुआरे के पास सीधा सवाल पूछने और भरोसेमंद जवाब पाने का कोई तरीका नहीं था — अब तक।",
    problemTags: ["उपग्रह SST", "क्लोरोफिल स्तर", "IMD मौसम", "तटरक्षक सूचनाएँ"],
    problemQuestion: "\"क्या मैं कल मछली पकड़ने जा सकता हूँ?\"",
    agentsKicker: "दस एजेंट, एक फ़ैसला",
    agentsTitle: "टीम से मिलिए",
    agentsSub: "हर सवाल एक साथ काम करने वाले विशेषज्ञों तक पहुँचता है — कोई एक मॉडल अकेले अंदाज़ा नहीं लगाता।",
    agents: [
      { name: "इंटेंट एजेंट", line: "किसी भी भाषा में सवाल को एक स्पष्ट, काम के अनुरोध में बदलता है" },
      { name: "प्लैनर", line: "सभी विशेषज्ञों को एक साथ भेजता है और अंतिम जवाब तैयार करता है" },
      { name: "मौसम एजेंट", line: "Open-Meteo से लाइव हवा, लहर की ऊँचाई और सूजन लाता है" },
      { name: "सागर एजेंट", line: "SST और क्लोरोफिल पढ़कर हर मत्स्य क्षेत्र को अंक देता है" },
      { name: "PFZ एजेंट", line: "संभावित मत्स्य क्षेत्रों को 0–100 अंक, संभावित प्रजाति बताता है" },
      { name: "चक्रवात एजेंट", line: "क्षेत्र में IMD चक्रवात और ऊँची लहर की चेतावनियों पर नज़र रखता है" },
      { name: "GIS एजेंट", line: "असली सीमा डेटा के विरुद्ध पॉइंट-इन-पॉलीगन और रूट जाँचता है" },
      { name: "रिस्क एजेंट", line: "सुरक्षा फ़्लोर के साथ हर कारक को 0–100 फ़ैसले में जोड़ता है" },
      { name: "रूट एजेंट", line: "कॉस्ट-वेटेड ग्रिड पर A* चलाता है, प्रतिबंधित क्षेत्रों से बचाता है" },
      { name: "व्याख्या एजेंट", line: "हर अंक के साथ स्रोत, समय और भरोसे का स्तर जोड़ता है" },
    ],
    pipelineTitle: "MARVO फ़ैसला कैसे करता है",
    pipelineKicker: "क्या अलग है",
    pipelineSub: "हर बार चार क़दम — कुछ छूटता नहीं, कुछ छुपता नहीं।",
    trustKicker: "भरोसा और पारदर्शिता",
    trustTitle: "सिर्फ़ चालाक नहीं, भरोसेमंद बनाया गया",
    trustCards: [
      {
        title: "आधिकारिक चेतावनी हमेशा जीतती है",
        body: "अगर IMD, INCOIS या तटरक्षक चेतावनी जारी करते हैं, तो वह मॉडल के फ़ैसले को पूरी तरह पलट देती है। कोई स्कोर इंसानी अधिकार से ऊपर नहीं।",
      },
      {
        title: "हर अंक का सबूत है",
        body: "हर रीडिंग के साथ स्रोत, समय और भरोसे का स्तर होता है — कुछ भी बिना सबूत नहीं कहा जाता।",
      },
      {
        title: "जिसे सबसे ज़्यादा ज़रूरत है, उसके लिए बनाया",
        body: "अंग्रेज़ी, हिंदी और मराठी, बोलकर और लिखकर — साथ ही कम पढ़ने वालों के लिए एक-टैप आवाज़ रीडआउट।",
      },
    ],
    closingTitle: "इसे फ़ैसला लेते देखें, लाइव।",
    closingSub: "कोई साइन-अप नहीं, कोई API key नहीं — ऐप खोलें या गाइडेड टूर देखें।",
    footerTagline: "समुद्र में सुरक्षित दिनों के लिए सागरी बुद्धिमत्ता।",
    footerProductHeading: "उत्पाद",
    footerExploreHeading: "जानें",
    footerConnectHeading: "जुड़ें",
    footerSystemLabel: "सिस्टम",
    footerAgentsLabel: "एजेंट टीम",
    footerTrustLabel: "भरोसा",
    footerTourLabel: "गाइडेड टूर",
    stats: ["टीम के एजेंट", "लैंडिंग सेंटर", "आधिकारिक चेतावनियाँ", "भाषाएँ", "डेटा संस्करण"],
    cards: [
      {
        kicker: "आज की योजना",
        title: "मछली कहाँ है",
        lines: [
          "खुलते ही आपकी जगह जानता है — 100 किमी समुद्र ख़ुद पढ़ता है",
          "हर इलाक़े को मछली की संभावना पर अंक, कारण के साथ",
          "यात्रा योजना: कब जाएँ, कितना रुकें, कितना मिलेगा",
        ],
      },
      {
        kicker: "MARVO से पूछें",
        title: "आपकी भाषा, बोलकर या लिखकर",
        lines: [
          "English · हिंदी · मराठी — ख़ुद पहचानता है, कोई सेटिंग नहीं",
          "0–100 का जोखिम, हर अंक के हिसाब के साथ",
          "आधिकारिक चेतावनी मॉडल से हमेशा ऊपर।",
        ],
      },
      {
        kicker: "प्रशासन",
        title: "ज़िले का नज़ारा",
        lines: [
          "तट का हर लैंडिंग सेंटर, उसी इंजन से आँका हुआ",
          "प्रशासन वही प्रमाण देखता है जो मछुआरा देखता है",
          "दिन के बोर्ड का एक-क्लिक CSV निर्यात",
        ],
      },
    ],
    phases: [
      { t: "समझो", n: "सवाल परखो, किसी भी भाषा में" },
      { t: "जुटाओ", n: "पाँच विशेषज्ञ एक साथ निकलते हैं" },
      { t: "तय करो", n: "भारित मॉडल + नियम जो सिर्फ़ जोखिम बढ़ाते हैं" },
      { t: "समझाओ", n: "सीधी भाषा, स्रोतों के साथ, बोलकर भी" },
    ],
    footer:
      "नक़ली/डेमो डेटा पर हमेशा लेबल · MARVO निर्णय-सहायक है — आधिकारिक सलाह का विकल्प कभी नहीं",
  },
  mr: {
    tag1: "सागरी डेटाला निर्णयांमध्ये बदला.",
    tag2a: "बुद्धिमत्तेसह ",
    tag2b: "मार्गक्रमण करा",
    tag2c: ".",
    sub: "MARVO उपग्रह, सागरी आणि हवामान डेटा सहयोगी AI एजंट्सद्वारे एकत्र आणून, समुद्रातील सुरक्षित आणि हुशार निर्णयांसाठी स्पष्ट, स्पष्टीकरणासह माहिती आणि शिफारसी देते.",
    kicker: "SIH26176 · ISRO · स्मार्ट इंडिया हॅकेथॉन 2026",
    navFeatures: "वैशिष्ट्ये",
    navHow: "हे कसे कार्य करते",
    navTry: "वापरून पाहा",
    ctaTour: "गाइडेड टूर पाहा",
    ctaOpen: "MARVO अ‍ॅप उघडा",
    ctaPhone: "फोन आवृत्ती",
    ctaTry: "एक परिस्थिती वापरून पाहा → पारादीपजवळ चक्रीवादळ",
    openMarvo: "MARVO उघडा",
    openWord: "उघडा",
    watchLive: "हे चालताना पाहा →",
    featuresKicker: "MARVO काय करते",
    featuresTitle: "तीन दरवाजे, एक इंजिन",
    problemKicker: "समस्या",
    problemTitle: "डेटा सगळीकडे. उत्तर कुठेच नाही.",
    problemBody:
      "दररोज उपग्रह आणि हवामान केंद्रे समुद्र पृष्ठ तापमान, क्लोरोफिल आणि अंदाज डेटाचा महासागर तयार करतात. पण सकाळी ६ वाजता समुद्रात जायचे की नाही हे ठरवणाऱ्या मच्छीमाराकडे थेट प्रश्न विचारून विश्वासार्ह उत्तर मिळवण्याचा मार्ग नव्हता — आतापर्यंत.",
    problemTags: ["उपग्रह SST", "क्लोरोफिल पातळी", "IMD हवामान", "तटरक्षक सूचना"],
    problemQuestion: "\"मी उद्या मासेमारीला जाऊ शकतो का?\"",
    agentsKicker: "दहा एजंट, एक निर्णय",
    agentsTitle: "टीमला भेटा",
    agentsSub: "प्रत्येक प्रश्न एकाच वेळी काम करणाऱ्या तज्ज्ञांपर्यंत पोहोचतो — एकटा मॉडेल अंदाज लावत नाही.",
    agents: [
      { name: "इंटेंट एजंट", line: "कोणत्याही भाषेतील प्रश्नाला स्पष्ट, कृतियोग्य विनंतीत रूपांतरित करतो" },
      { name: "प्लॅनर", line: "सर्व तज्ज्ञांना एकाच वेळी पाठवतो आणि अंतिम उत्तर तयार करतो" },
      { name: "हवामान एजंट", line: "Open-Meteo वरून थेट वारा, लाटांची उंची आणि सूज आणतो" },
      { name: "सागर एजंट", line: "SST आणि क्लोरोफिल वाचून प्रत्येक मासेमारी जागेला गुण देतो" },
      { name: "PFZ एजंट", line: "संभाव्य मासेमारी क्षेत्रांना 0–100 गुण, संभाव्य प्रजाती सांगतो" },
      { name: "चक्रीवादळ एजंट", line: "क्षेत्रातील IMD चक्रीवादळ आणि उंच लाटांच्या इशाऱ्यावर लक्ष ठेवतो" },
      { name: "GIS एजंट", line: "खऱ्या सीमा डेटाविरुद्ध पॉइंट-इन-पॉलीगन आणि मार्ग तपासतो" },
      { name: "रिस्क एजंट", line: "सुरक्षा मर्यादांसह प्रत्येक घटक एकत्र करून 0–100 निर्णय देतो" },
      { name: "रूट एजंट", line: "कॉस्ट-वेटेड ग्रिडवर A* चालवतो, प्रतिबंधित क्षेत्रे टाळतो" },
      { name: "स्पष्टीकरण एजंट", line: "प्रत्येक आकड्यासोबत स्रोत, वेळ आणि विश्वासार्हता जोडतो" },
    ],
    pipelineTitle: "MARVO निर्णय कसा घेते",
    pipelineKicker: "वेगळेपण",
    pipelineSub: "प्रत्येक वेळी चार पावले — काहीही वगळले जात नाही, काहीही लपवले जात नाही.",
    trustKicker: "विश्वास व पारदर्शकता",
    trustTitle: "फक्त हुशार नाही, विश्वासार्ह बनवले",
    trustCards: [
      {
        title: "अधिकृत इशारा नेहमी वरचढ",
        body: "जर IMD, INCOIS किंवा तटरक्षक इशारा देत असतील, तर तो मॉडेलच्या निर्णयाला पूर्णपणे बदलतो. कोणताही गुण मानवी अधिकारापेक्षा वर नाही.",
      },
      {
        title: "प्रत्येक आकड्याला पुरावा",
        body: "प्रत्येक वाचनासोबत स्रोत, वेळ आणि विश्वासार्हता असते — काहीही पुराव्याशिवाय सांगितले जात नाही.",
      },
      {
        title: "ज्यांना सर्वात जास्त गरज आहे त्यांच्यासाठी बनवलेले",
        body: "इंग्रजी, हिंदी आणि मराठी, बोलून आणि लिहून — तसेच कमी वाचणाऱ्यांसाठी एक-टॅप आवाज सुविधा.",
      },
    ],
    closingTitle: "हे निर्णय घेताना पहा, लाइव्ह.",
    closingSub: "साइन-अप नाही, API key नाही — अ‍ॅप उघडा किंवा गाइडेड टूर पहा.",
    footerTagline: "समुद्रातील सुरक्षित दिवसांसाठी सागरी बुद्धिमत्ता.",
    footerProductHeading: "उत्पादन",
    footerExploreHeading: "जाणून घ्या",
    footerConnectHeading: "जोडा",
    footerSystemLabel: "सिस्टीम",
    footerAgentsLabel: "एजंट टीम",
    footerTrustLabel: "विश्वास",
    footerTourLabel: "गाइडेड टूर",
    stats: ["टीममधील एजंट", "लँडिंग सेंटर", "अधिकृत इशारे", "भाषा", "डेटा आवृत्ती"],
    cards: [
      {
        kicker: "आजची योजना",
        title: "मासे कुठे आहेत",
        lines: [
          "उघडताच तुमचे ठिकाण ओळखते — १०० किमी समुद्र स्वतः वाचते",
          "प्रत्येक जागेला माशांच्या शक्यतेवर गुण, कारणासह",
          "फेरीची योजना: कधी जायचे, किती थांबायचे, किती मिळेल",
        ],
      },
      {
        kicker: "MARVO ला विचारा",
        title: "तुमची भाषा, बोलून किंवा लिहून",
        lines: [
          "English · हिंदी · मराठी — स्वतः ओळखते, सेटिंग नाही",
          "0–100 धोका, प्रत्येक गुणाच्या हिशेबासह",
          "अधिकृत इशारा मॉडेलच्या नेहमी वर.",
        ],
      },
      {
        kicker: "प्रशासन",
        title: "जिल्ह्याचे दृश्य",
        lines: [
          "किनाऱ्यावरील प्रत्येक लँडिंग सेंटर, त्याच इंजिनने तपासलेले",
          "प्रशासनाला तेच पुरावे दिसतात जे मच्छीमाराला दिसतात",
          "दिवसाच्या बोर्डाचे एक-क्लिक CSV निर्यात",
        ],
      },
    ],
    phases: [
      { t: "समजून घ्या", n: "प्रश्न पारखा, कोणत्याही भाषेत" },
      { t: "गोळा करा", n: "पाच तज्ज्ञ एकाच वेळी निघतात" },
      { t: "ठरवा", n: "भारित मॉडेल + फक्त धोका वाढवणारे नियम" },
      { t: "समजावा", n: "सोपी भाषा, स्रोतांसह, बोलूनही" },
    ],
    footer:
      "नमुना/डेमो डेटावर नेहमी लेबल · MARVO निर्णय-सहाय्यक आहे — अधिकृत सल्ल्याचा पर्याय कधीही नाही",
  },

  ta: {
    tag1: "Turn marine data into decisions.",
    tag2a: "Navigate with ",
    tag2b: "intelligence",
    tag2c: ".",
    sub: "MARVO brings together satellite, oceanographic, and weather data through collaborative AI agents to deliver clear, explainable insights and actionable recommendations for safer, smarter decisions at sea.",
    kicker: "SIH26176 · ISRO · Smart India Hackathon 2026",
    navFeatures: "Features",
    navHow: "How it works",
    navTry: "Try it",
    ctaTour: "Watch the guided tour",
    ctaOpen: "Open the MARVO app",
    ctaPhone: "Phone version",
    ctaTry: "Try a scenario → cyclone near Paradip",
    openMarvo: "Open MARVO",
    openWord: "Open",
    watchLive: "watch it run live →",
    featuresKicker: "What MARVO does",
    featuresTitle: "Three doors, one engine",
    problemKicker: "The problem",
    problemTitle: "Data everywhere. An answer nowhere.",
    problemBody:
      "Every day, satellites and weather stations generate oceans of sea-surface temperature, chlorophyll, and forecast data. But a fisherman deciding whether to sail at 6 AM has no way to ask a straight question and get a straight, trustworthy answer — until now.",
    problemTags: ["Satellite SST", "Chlorophyll bands", "IMD weather", "Coast Guard bulletins"],
    problemQuestion: "\"Can I go fishing tomorrow?\"",
    agentsKicker: "Ten agents, one decision",
    agentsTitle: "Meet the crew",
    agentsSub: "Every question fans out to specialists working at once — not one model guessing alone.",
    agents: [
      { name: "Intent Agent", line: "Parses any language query into a structured, actionable request" },
      { name: "Planner", line: "Fans out to all specialists concurrently and assembles the final response" },
      { name: "Weather Agent", line: "Fetches live wind, wave height, and swell from Open-Meteo" },
      { name: "Ocean Agent", line: "Reads SST and chlorophyll to score every fishing ground" },
      { name: "PFZ Agent", line: "Ranks potential fishing zones 0–100 and predicts likely species" },
      { name: "Cyclone Agent", line: "Tracks IMD cyclone and high-wave warnings in the region" },
      { name: "GIS Agent", line: "Runs point-in-polygon and route checks against real boundary data" },
      { name: "Risk Agent", line: "Weighs every factor into one 0–100 verdict with safety floors" },
      { name: "Route Agent", line: "Runs A* on a cost-weighted grid, rejects routes through restricted zones" },
      { name: "Explanation Agent", line: "Attaches a source, timestamp, and confidence to every number" },
    ],
    pipelineTitle: "How MARVO decides",
    pipelineKicker: "The differentiator",
    pipelineSub: "Four moves, every time — nothing skipped, nothing hidden.",
    trustKicker: "Trust & transparency",
    trustTitle: "Built to be trusted, not just clever",
    trustCards: [
      {
        title: "Official warnings always win",
        body: "If IMD, INCOIS, or the Coast Guard issue a warning, it overrides the model's verdict completely. No score outranks a human authority.",
      },
      {
        title: "Every number has a receipt",
        body: "Each reading carries its source, timestamp, and confidence — so nothing is a black box, and nothing is asserted without evidence.",
      },
      {
        title: "Built for who needs it most",
        body: "English, Hindi, and Marathi, spoken and typed — plus a one-tap voice readout for users who may read little.",
      },
    ],
    closingTitle: "See it decide, live.",
    closingSub: "No sign-up, no API key — open the app or watch the guided tour.",
    footerTagline: "Marine intelligence for safer days at sea.",
    footerProductHeading: "Product",
    footerExploreHeading: "Explore",
    footerConnectHeading: "Connect",
    footerSystemLabel: "System",
    footerAgentsLabel: "Agent crew",
    footerTrustLabel: "Trust",
    footerTourLabel: "Guided tour",
    stats: ["Agents in the crew", "Landing centres", "Official warnings", "Languages", "Data edition"],
    cards: [
      {
        kicker: "Today's plan",
        title: "Where the fish are",
        lines: [
          "Opens knowing where you are — reads 100 km of sea unprompted",
          "Every ground scored for chance of fish, with the why behind it",
          "Trip plan: when to go, how long to stay, what it should earn",
        ],
      },
      {
        kicker: "Ask MARVO",
        title: "Your language, spoken or typed",
        lines: [
          "English · हिंदी · मराठी — detected, never configured",
          "A 0–100 risk verdict where every point is attributed",
          "Official warnings override the model. Always.",
        ],
      },
      {
        kicker: "Authority",
        title: "The district view",
        lines: [
          "Every landing centre on the coast, scored by the same engine",
          "The administration sees the same evidence the fisher sees",
          "One-click CSV export for the day's advisory board",
        ],
      },
    ],
    phases: [
      { t: "Understand", n: "parse the question, any language" },
      { t: "Gather", n: "five specialists fan out concurrently" },
      { t: "Decide", n: "weighted model + safety floors that only raise" },
      { t: "Explain", n: "plain words, with sources, spoken back" },
    ],
    footer:
      "Demo / simulated data is always labelled · MARVO is decision support — never a replacement for an official advisory",
  },
  te: {
    tag1: "Turn marine data into decisions.",
    tag2a: "Navigate with ",
    tag2b: "intelligence",
    tag2c: ".",
    sub: "MARVO brings together satellite, oceanographic, and weather data through collaborative AI agents to deliver clear, explainable insights and actionable recommendations for safer, smarter decisions at sea.",
    kicker: "SIH26176 · ISRO · Smart India Hackathon 2026",
    navFeatures: "Features",
    navHow: "How it works",
    navTry: "Try it",
    ctaTour: "Watch the guided tour",
    ctaOpen: "Open the MARVO app",
    ctaPhone: "Phone version",
    ctaTry: "Try a scenario → cyclone near Paradip",
    openMarvo: "Open MARVO",
    openWord: "Open",
    watchLive: "watch it run live →",
    featuresKicker: "What MARVO does",
    featuresTitle: "Three doors, one engine",
    problemKicker: "The problem",
    problemTitle: "Data everywhere. An answer nowhere.",
    problemBody:
      "Every day, satellites and weather stations generate oceans of sea-surface temperature, chlorophyll, and forecast data. But a fisherman deciding whether to sail at 6 AM has no way to ask a straight question and get a straight, trustworthy answer — until now.",
    problemTags: ["Satellite SST", "Chlorophyll bands", "IMD weather", "Coast Guard bulletins"],
    problemQuestion: "\"Can I go fishing tomorrow?\"",
    agentsKicker: "Ten agents, one decision",
    agentsTitle: "Meet the crew",
    agentsSub: "Every question fans out to specialists working at once — not one model guessing alone.",
    agents: [
      { name: "Intent Agent", line: "Parses any language query into a structured, actionable request" },
      { name: "Planner", line: "Fans out to all specialists concurrently and assembles the final response" },
      { name: "Weather Agent", line: "Fetches live wind, wave height, and swell from Open-Meteo" },
      { name: "Ocean Agent", line: "Reads SST and chlorophyll to score every fishing ground" },
      { name: "PFZ Agent", line: "Ranks potential fishing zones 0–100 and predicts likely species" },
      { name: "Cyclone Agent", line: "Tracks IMD cyclone and high-wave warnings in the region" },
      { name: "GIS Agent", line: "Runs point-in-polygon and route checks against real boundary data" },
      { name: "Risk Agent", line: "Weighs every factor into one 0–100 verdict with safety floors" },
      { name: "Route Agent", line: "Runs A* on a cost-weighted grid, rejects routes through restricted zones" },
      { name: "Explanation Agent", line: "Attaches a source, timestamp, and confidence to every number" },
    ],
    pipelineTitle: "How MARVO decides",
    pipelineKicker: "The differentiator",
    pipelineSub: "Four moves, every time — nothing skipped, nothing hidden.",
    trustKicker: "Trust & transparency",
    trustTitle: "Built to be trusted, not just clever",
    trustCards: [
      {
        title: "Official warnings always win",
        body: "If IMD, INCOIS, or the Coast Guard issue a warning, it overrides the model's verdict completely. No score outranks a human authority.",
      },
      {
        title: "Every number has a receipt",
        body: "Each reading carries its source, timestamp, and confidence — so nothing is a black box, and nothing is asserted without evidence.",
      },
      {
        title: "Built for who needs it most",
        body: "English, Hindi, and Marathi, spoken and typed — plus a one-tap voice readout for users who may read little.",
      },
    ],
    closingTitle: "See it decide, live.",
    closingSub: "No sign-up, no API key — open the app or watch the guided tour.",
    footerTagline: "Marine intelligence for safer days at sea.",
    footerProductHeading: "Product",
    footerExploreHeading: "Explore",
    footerConnectHeading: "Connect",
    footerSystemLabel: "System",
    footerAgentsLabel: "Agent crew",
    footerTrustLabel: "Trust",
    footerTourLabel: "Guided tour",
    stats: ["Agents in the crew", "Landing centres", "Official warnings", "Languages", "Data edition"],
    cards: [
      {
        kicker: "Today's plan",
        title: "Where the fish are",
        lines: [
          "Opens knowing where you are — reads 100 km of sea unprompted",
          "Every ground scored for chance of fish, with the why behind it",
          "Trip plan: when to go, how long to stay, what it should earn",
        ],
      },
      {
        kicker: "Ask MARVO",
        title: "Your language, spoken or typed",
        lines: [
          "English · हिंदी · मराठी — detected, never configured",
          "A 0–100 risk verdict where every point is attributed",
          "Official warnings override the model. Always.",
        ],
      },
      {
        kicker: "Authority",
        title: "The district view",
        lines: [
          "Every landing centre on the coast, scored by the same engine",
          "The administration sees the same evidence the fisher sees",
          "One-click CSV export for the day's advisory board",
        ],
      },
    ],
    phases: [
      { t: "Understand", n: "parse the question, any language" },
      { t: "Gather", n: "five specialists fan out concurrently" },
      { t: "Decide", n: "weighted model + safety floors that only raise" },
      { t: "Explain", n: "plain words, with sources, spoken back" },
    ],
    footer:
      "Demo / simulated data is always labelled · MARVO is decision support — never a replacement for an official advisory",
  },
  bn: {
    tag1: "Turn marine data into decisions.",
    tag2a: "Navigate with ",
    tag2b: "intelligence",
    tag2c: ".",
    sub: "MARVO brings together satellite, oceanographic, and weather data through collaborative AI agents to deliver clear, explainable insights and actionable recommendations for safer, smarter decisions at sea.",
    kicker: "SIH26176 · ISRO · Smart India Hackathon 2026",
    navFeatures: "Features",
    navHow: "How it works",
    navTry: "Try it",
    ctaTour: "Watch the guided tour",
    ctaOpen: "Open the MARVO app",
    ctaPhone: "Phone version",
    ctaTry: "Try a scenario → cyclone near Paradip",
    openMarvo: "Open MARVO",
    openWord: "Open",
    watchLive: "watch it run live →",
    featuresKicker: "What MARVO does",
    featuresTitle: "Three doors, one engine",
    problemKicker: "The problem",
    problemTitle: "Data everywhere. An answer nowhere.",
    problemBody:
      "Every day, satellites and weather stations generate oceans of sea-surface temperature, chlorophyll, and forecast data. But a fisherman deciding whether to sail at 6 AM has no way to ask a straight question and get a straight, trustworthy answer — until now.",
    problemTags: ["Satellite SST", "Chlorophyll bands", "IMD weather", "Coast Guard bulletins"],
    problemQuestion: "\"Can I go fishing tomorrow?\"",
    agentsKicker: "Ten agents, one decision",
    agentsTitle: "Meet the crew",
    agentsSub: "Every question fans out to specialists working at once — not one model guessing alone.",
    agents: [
      { name: "Intent Agent", line: "Parses any language query into a structured, actionable request" },
      { name: "Planner", line: "Fans out to all specialists concurrently and assembles the final response" },
      { name: "Weather Agent", line: "Fetches live wind, wave height, and swell from Open-Meteo" },
      { name: "Ocean Agent", line: "Reads SST and chlorophyll to score every fishing ground" },
      { name: "PFZ Agent", line: "Ranks potential fishing zones 0–100 and predicts likely species" },
      { name: "Cyclone Agent", line: "Tracks IMD cyclone and high-wave warnings in the region" },
      { name: "GIS Agent", line: "Runs point-in-polygon and route checks against real boundary data" },
      { name: "Risk Agent", line: "Weighs every factor into one 0–100 verdict with safety floors" },
      { name: "Route Agent", line: "Runs A* on a cost-weighted grid, rejects routes through restricted zones" },
      { name: "Explanation Agent", line: "Attaches a source, timestamp, and confidence to every number" },
    ],
    pipelineTitle: "How MARVO decides",
    pipelineKicker: "The differentiator",
    pipelineSub: "Four moves, every time — nothing skipped, nothing hidden.",
    trustKicker: "Trust & transparency",
    trustTitle: "Built to be trusted, not just clever",
    trustCards: [
      {
        title: "Official warnings always win",
        body: "If IMD, INCOIS, or the Coast Guard issue a warning, it overrides the model's verdict completely. No score outranks a human authority.",
      },
      {
        title: "Every number has a receipt",
        body: "Each reading carries its source, timestamp, and confidence — so nothing is a black box, and nothing is asserted without evidence.",
      },
      {
        title: "Built for who needs it most",
        body: "English, Hindi, and Marathi, spoken and typed — plus a one-tap voice readout for users who may read little.",
      },
    ],
    closingTitle: "See it decide, live.",
    closingSub: "No sign-up, no API key — open the app or watch the guided tour.",
    footerTagline: "Marine intelligence for safer days at sea.",
    footerProductHeading: "Product",
    footerExploreHeading: "Explore",
    footerConnectHeading: "Connect",
    footerSystemLabel: "System",
    footerAgentsLabel: "Agent crew",
    footerTrustLabel: "Trust",
    footerTourLabel: "Guided tour",
    stats: ["Agents in the crew", "Landing centres", "Official warnings", "Languages", "Data edition"],
    cards: [
      {
        kicker: "Today's plan",
        title: "Where the fish are",
        lines: [
          "Opens knowing where you are — reads 100 km of sea unprompted",
          "Every ground scored for chance of fish, with the why behind it",
          "Trip plan: when to go, how long to stay, what it should earn",
        ],
      },
      {
        kicker: "Ask MARVO",
        title: "Your language, spoken or typed",
        lines: [
          "English · हिंदी · मराठी — detected, never configured",
          "A 0–100 risk verdict where every point is attributed",
          "Official warnings override the model. Always.",
        ],
      },
      {
        kicker: "Authority",
        title: "The district view",
        lines: [
          "Every landing centre on the coast, scored by the same engine",
          "The administration sees the same evidence the fisher sees",
          "One-click CSV export for the day's advisory board",
        ],
      },
    ],
    phases: [
      { t: "Understand", n: "parse the question, any language" },
      { t: "Gather", n: "five specialists fan out concurrently" },
      { t: "Decide", n: "weighted model + safety floors that only raise" },
      { t: "Explain", n: "plain words, with sources, spoken back" },
    ],
    footer:
      "Demo / simulated data is always labelled · MARVO is decision support — never a replacement for an official advisory",
  },
  ml: {
    tag1: "Turn marine data into decisions.",
    tag2a: "Navigate with ",
    tag2b: "intelligence",
    tag2c: ".",
    sub: "MARVO brings together satellite, oceanographic, and weather data through collaborative AI agents to deliver clear, explainable insights and actionable recommendations for safer, smarter decisions at sea.",
    kicker: "SIH26176 · ISRO · Smart India Hackathon 2026",
    navFeatures: "Features",
    navHow: "How it works",
    navTry: "Try it",
    ctaTour: "Watch the guided tour",
    ctaOpen: "Open the MARVO app",
    ctaPhone: "Phone version",
    ctaTry: "Try a scenario → cyclone near Paradip",
    openMarvo: "Open MARVO",
    openWord: "Open",
    watchLive: "watch it run live →",
    featuresKicker: "What MARVO does",
    featuresTitle: "Three doors, one engine",
    problemKicker: "The problem",
    problemTitle: "Data everywhere. An answer nowhere.",
    problemBody:
      "Every day, satellites and weather stations generate oceans of sea-surface temperature, chlorophyll, and forecast data. But a fisherman deciding whether to sail at 6 AM has no way to ask a straight question and get a straight, trustworthy answer — until now.",
    problemTags: ["Satellite SST", "Chlorophyll bands", "IMD weather", "Coast Guard bulletins"],
    problemQuestion: "\"Can I go fishing tomorrow?\"",
    agentsKicker: "Ten agents, one decision",
    agentsTitle: "Meet the crew",
    agentsSub: "Every question fans out to specialists working at once — not one model guessing alone.",
    agents: [
      { name: "Intent Agent", line: "Parses any language query into a structured, actionable request" },
      { name: "Planner", line: "Fans out to all specialists concurrently and assembles the final response" },
      { name: "Weather Agent", line: "Fetches live wind, wave height, and swell from Open-Meteo" },
      { name: "Ocean Agent", line: "Reads SST and chlorophyll to score every fishing ground" },
      { name: "PFZ Agent", line: "Ranks potential fishing zones 0–100 and predicts likely species" },
      { name: "Cyclone Agent", line: "Tracks IMD cyclone and high-wave warnings in the region" },
      { name: "GIS Agent", line: "Runs point-in-polygon and route checks against real boundary data" },
      { name: "Risk Agent", line: "Weighs every factor into one 0–100 verdict with safety floors" },
      { name: "Route Agent", line: "Runs A* on a cost-weighted grid, rejects routes through restricted zones" },
      { name: "Explanation Agent", line: "Attaches a source, timestamp, and confidence to every number" },
    ],
    pipelineTitle: "How MARVO decides",
    pipelineKicker: "The differentiator",
    pipelineSub: "Four moves, every time — nothing skipped, nothing hidden.",
    trustKicker: "Trust & transparency",
    trustTitle: "Built to be trusted, not just clever",
    trustCards: [
      {
        title: "Official warnings always win",
        body: "If IMD, INCOIS, or the Coast Guard issue a warning, it overrides the model's verdict completely. No score outranks a human authority.",
      },
      {
        title: "Every number has a receipt",
        body: "Each reading carries its source, timestamp, and confidence — so nothing is a black box, and nothing is asserted without evidence.",
      },
      {
        title: "Built for who needs it most",
        body: "English, Hindi, and Marathi, spoken and typed — plus a one-tap voice readout for users who may read little.",
      },
    ],
    closingTitle: "See it decide, live.",
    closingSub: "No sign-up, no API key — open the app or watch the guided tour.",
    footerTagline: "Marine intelligence for safer days at sea.",
    footerProductHeading: "Product",
    footerExploreHeading: "Explore",
    footerConnectHeading: "Connect",
    footerSystemLabel: "System",
    footerAgentsLabel: "Agent crew",
    footerTrustLabel: "Trust",
    footerTourLabel: "Guided tour",
    stats: ["Agents in the crew", "Landing centres", "Official warnings", "Languages", "Data edition"],
    cards: [
      {
        kicker: "Today's plan",
        title: "Where the fish are",
        lines: [
          "Opens knowing where you are — reads 100 km of sea unprompted",
          "Every ground scored for chance of fish, with the why behind it",
          "Trip plan: when to go, how long to stay, what it should earn",
        ],
      },
      {
        kicker: "Ask MARVO",
        title: "Your language, spoken or typed",
        lines: [
          "English · हिंदी · मराठी — detected, never configured",
          "A 0–100 risk verdict where every point is attributed",
          "Official warnings override the model. Always.",
        ],
      },
      {
        kicker: "Authority",
        title: "The district view",
        lines: [
          "Every landing centre on the coast, scored by the same engine",
          "The administration sees the same evidence the fisher sees",
          "One-click CSV export for the day's advisory board",
        ],
      },
    ],
    phases: [
      { t: "Understand", n: "parse the question, any language" },
      { t: "Gather", n: "five specialists fan out concurrently" },
      { t: "Decide", n: "weighted model + safety floors that only raise" },
      { t: "Explain", n: "plain words, with sources, spoken back" },
    ],
    footer:
      "Demo / simulated data is always labelled · MARVO is decision support — never a replacement for an official advisory",
  },

};

function prefersStill(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** True once the element has scrolled into view (fail-safe: always true after a few seconds
 *  or when motion is reduced, so content can never stay hidden). */
function useInView<T extends HTMLElement>(delay = 0): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersStill() || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    const failsafe = window.setTimeout(() => setShown(true), 4500 + delay);
    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [delay]);
  return [ref, shown];
}

function Reveal({
  className = "",
  children,
  delay = 0,
  from = "up",
}: {
  delay?: number;
  className?: string;
  from?: "up" | "left" | "right" | "zoom";
  children: ReactNode;
}) {
  const [ref, shown] = useInView<HTMLDivElement>(delay);
  return (
    <div
      ref={ref}
      className={`${className} rv rv-${from} ${shown ? "rv-in" : ""}`}
      style={{ "--rv-d": `${Math.min(delay, 420)}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function useCountUp(target: number | null, ms = 1000): string {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target == null) return;
    if (prefersStill()) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / ms));
      setV(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const settle = window.setTimeout(() => setV(target), ms + 150);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [target, ms]);
  return target == null ? "—" : String(v);
}

function SectionHeading({
  id,
  kicker,
  title,
  sub,
}: {
  id?: string;
  kicker: string;
  title: string;
  sub?: string;
}) {
  const [ref, shown] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} id={id} className={`rv rv-left mt-16 max-w-[640px] scroll-mt-28 ${shown ? "rv-in" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="sec-line h-px w-6 bg-chart-500/70" />
        <span className="label !text-chart-600">{kicker}</span>
      </div>
      <h2 className="mt-2 font-display text-[26px] font-black leading-tight tracking-tight text-ink-900 sm:text-[30px]">
        {title}
      </h2>
      {sub && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">{sub}</p>}
    </div>
  );
}

export default function Landing({
  mode,
  language = "en",
  onLanguage,
  onEnter,
  onTour,
  onScenario,
}: {
  mode: string;
  language?: Language;
  onLanguage: (lang: Language) => void;
  onEnter: (tab: "home" | "ask" | "authority" | "system") => void;
  onTour: () => void;
  onScenario: (ask: string) => void;
}) {
  const t = L10N[language] ?? L10N.en;
  const [centres, setCentres] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .authority()
      .then((d) => {
        if (!alive) return;
        setCentres(d.summary.monitored ?? null);
        setWarnings(d.summary.official_warnings ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const agentsN = useCountUp(10, 900);
  const centresN = useCountUp(centres, 1100);
  const warningsN = useCountUp(warnings, 1300);
  const langsN = useCountUp(3, 800);
  const heroConfidence = useCountUp(92, 1100);

  const cardTabs: ("home" | "ask" | "authority")[] = ["home", "ask", "authority"];

  const stats = [
    { k: t.stats[0], v: agentsN },
    { k: t.stats[1], v: centresN },
    { k: t.stats[2], v: warningsN, warn: (warnings ?? 0) > 0 },
    { k: t.stats[3], v: langsN },
    { k: t.stats[4], v: mode },
  ];

  return (
    <>
        <nav className="fixed left-0 top-0 z-50 w-full border-b border-[var(--rule)] bg-paper-50/90 backdrop-blur-sm">
          <div className="mx-auto grid max-w-[1240px] grid-cols-[auto_1fr_auto] items-center gap-8 px-5 py-3">
            <BrandLogo className="lp-nav-logo shrink-0" />
            <div className="hidden items-center justify-center gap-8 md:flex">
              <button
                onClick={() => document.getElementById("lp-features")?.scrollIntoView({ behavior: "smooth" })}
                className="nav-link relative font-sans text-[15px] font-semibold tracking-normal text-ink-500 transition-colors after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[1.5px] after:origin-center after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:text-ink-900 hover:after:scale-x-100 focus-visible:text-ink-900 focus-visible:after:scale-x-100"
              >
                {t.navFeatures}
              </button>
              <button
                onClick={() => document.getElementById("lp-pipeline")?.scrollIntoView({ behavior: "smooth" })}
                className="nav-link relative font-sans text-[15px] font-semibold tracking-normal text-ink-500 transition-colors after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[1.5px] after:origin-center after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:text-ink-900 hover:after:scale-x-100 focus-visible:text-ink-900 focus-visible:after:scale-x-100"
              >
                {t.navHow}
              </button>
              <button
                onClick={() => onScenario("Is there a cyclone near Paradip? Can I go fishing?")}
                className="nav-link relative font-sans text-[15px] font-semibold tracking-normal text-ink-500 transition-colors after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[1.5px] after:origin-center after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:text-ink-900 hover:after:scale-x-100 focus-visible:text-ink-900 focus-visible:after:scale-x-100"
              >
                {t.navTry}
              </button>
            </div>
            <button onClick={() => onEnter("home")} className="btn-ink group shrink-0 justify-self-end !px-5 !py-2.5">
              {t.openMarvo}{" "}
              <CourseArrow size={13} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </nav>

      <div className="mx-auto flex min-h-full max-w-[1240px] flex-col px-5 pb-5 pt-[104px]">
      <div className="sea-drift" aria-hidden />
      <div className="fish-drift" aria-hidden />

      <HeroSky confidence={heroConfidence} className="flex min-h-[calc(100svh-104px)] flex-col justify-center pb-24 pt-6">
      {/* hero */}
      <div className="mt-0 grid items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-x-12 xl:gap-x-16">
        <div>
          <Reveal delay={200}>
            <p className="hero-title max-w-[620px] font-display text-[40px] font-black leading-[1.16] tracking-tight text-ink-900 sm:text-[46px] lg:text-[52px]">
              {t.tag1}
              <br />
              {t.tag2a}
              <br />
              <span className="hs-ul text-chart-600">{t.tag2b}</span>
              {t.tag2c}
            </p>
            <p className="mt-6 max-w-[520px] text-[16px] leading-relaxed text-ink-600 lg:text-[17px]">{t.sub}</p>
          </Reveal>

          <Reveal delay={330}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button onClick={onTour} className="btn-line !px-5 !py-2.5">
                <PlayGlyph size={11} /> {t.ctaTour}
              </button>
              <button onClick={() => onEnter("home")} className="btn-ink group !px-5 !py-2.5">
                {t.ctaOpen}{" "}
                <CourseArrow size={13} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => (window.location.href = `/?m=1&lang=${language}`)}
                className="btn-line !px-5 !py-2.5"
              >
                <PhoneGlyph size={13} /> {t.ctaPhone}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-5">
              <button
                onClick={() => onScenario("Is there a cyclone near Paradip? Can I go fishing?")}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-chart-600 underline decoration-dashed underline-offset-4 transition-colors hover:text-ink-900"
              >
                {t.ctaTry}
              </button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={260} className="w-full justify-self-center lg:justify-self-end">
          <HeroDemo language={language} />
        </Reveal>
      </div>

      <Reveal delay={760} className="mt-8 flex justify-center">
        <button
          onClick={() =>
            document.getElementById("lp-more")?.scrollIntoView({ behavior: "smooth" })
          }
          className="scroll-cue flex flex-col items-center gap-1 text-ink-400 transition-colors hover:text-chart-600"
          aria-label="Scroll to see more"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.18em]">More below</span>
          <CourseArrow size={13} className="rotate-90" />
        </button>
      </Reveal>
      </HeroSky>
      {/* ================= /HERO SCREEN ================= */}

      <div id="lp-more" />

      <Reveal delay={420}>
        <div className="stats-strip panel mt-12 grid grid-cols-2 sm:grid-cols-5">
          {stats.map((x, i) => (
            <div
              key={x.k}
              className={`group px-4 py-3.5 transition-colors hover:bg-chart-100/40 ${i > 0 ? "border-l" : ""}`}
              style={{ borderColor: "var(--rule-faint)" }}
            >
              <div className="label truncate !text-[9px]">{x.k}</div>
              <div
                className={`mt-1 font-mono text-[21px] font-bold tabular-nums leading-none transition-colors ${
                  x.warn ? "text-risk-extreme" : "text-ink-900 group-hover:text-chart-600"
                }`}
              >
                {x.v}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* problem — why MARVO needs to exist at all */}
      <SectionHeading id="lp-problem" kicker={t.problemKicker} title={t.problemTitle} />
      <Reveal delay={480}>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
          <div className="prob-a panel p-6">
            <span className="prob-scan" aria-hidden />
            <p className="text-[14.5px] leading-relaxed text-ink-700">{t.problemBody}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {t.problemTags.map((tag, ti) => (
                <span
                  key={tag}
                  className="prob-tag inline-flex items-center gap-1.5 rounded-[2px] border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-500"
                  style={{ borderColor: "var(--rule)", "--i": ti } as CSSProperties}
                >
                  <WarnGlyph size={10} className="prob-warn text-risk-high/70" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="prob-b panel lift flex flex-col items-center justify-center gap-3 p-5 text-center">
            <div className="grid w-full grid-cols-2 gap-2">
              {t.problemTags.map((tag) => (
                <div
                  key={tag}
                  className="rounded-[2px] border px-2 py-1.5 font-mono text-[9.5px] text-ink-400"
                  style={{ borderColor: "var(--rule-faint)" }}
                >
                  {tag}
                </div>
              ))}
            </div>
            <span className="signal-line w-2/3">
              <i /> <i /> <i />
            </span>
            <CourseArrow size={15} className="rotate-90 text-ink-300" />
            <div
              className="rounded-[2px] border-2 border-dashed px-4 py-3 font-display text-[15px] font-bold leading-snug text-ink-900"
              style={{ borderColor: "var(--rule-strong)" }}
            >
              {t.problemQuestion}
            </div>
          </div>
        </div>
      </Reveal>

      {/* feature cards */}
      <SectionHeading kicker={t.featuresKicker} title={t.featuresTitle} />
      <div id="lp-features" className="mt-5 scroll-mt-28 grid gap-4 md:grid-cols-[1.2fr_1fr] md:grid-rows-2">
        {t.cards.map((c, i) => (
          <Reveal key={cardTabs[i]} delay={i * 120} from={i === 0 ? "left" : "right"} className={i === 0 ? "md:row-span-2" : ""}>
            <div className="panel rule-double lift group flex h-full flex-col">
              <div className="hd">
                <span className="label flex items-center gap-2 transition-colors group-hover:!text-chart-600">
                  {c.kicker}
                  {i === 0 && <FishGlyph size={15} className="swim text-chart-500" />}
                </span>
              </div>
              <div className="relative flex-1 overflow-hidden px-4 py-4">
                <h3 className={`font-display font-bold leading-snug text-ink-900 ${i === 0 ? "text-[26px]" : "text-[19px]"}`}>
                  {c.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {c.lines.map((l) => (
                    <li key={l} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-700">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-chart-500/70 transition-transform group-hover:rotate-[135deg] group-hover:bg-chart-500" style={{ transitionDuration: "500ms" }} />
                      {l}
                    </li>
                  ))}
                </ul>
                {i === 0 && (
                  <>
                    <div className="feat-radar" aria-hidden>
                      <span className="fr-ring fr-ring-1" />
                      <span className="fr-ring fr-ring-2" />
                      <span className="fr-ring fr-ring-3" />
                      <span className="fr-cross fr-cross-h" />
                      <span className="fr-cross fr-cross-v" />
                      <span className="fr-sweep" />
                      <span className="fr-blip fr-blip-a"><i /><b>86</b></span>
                      <span className="fr-blip fr-blip-b"><i /><b>72</b></span>
                      <span className="fr-blip fr-blip-c"><i /><b>58</b></span>
                      <span className="fr-me" />
                    </div>
                    <div className="feat-swell" aria-hidden />
                  </>
                )}
              </div>
              <div className="border-t px-4 py-3" style={{ borderColor: "var(--rule-faint)" }}>
                <button onClick={() => onEnter(cardTabs[i])} className="btn-line group/open w-full justify-center">
                  {t.openWord}{" "}
                  <CourseArrow size={12} className="transition-transform group-hover/open:translate-x-1" />
                </button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* the agent crew — proves "collaborative agents" isn't just a subtitle */}
      <SectionHeading id="lp-agents" kicker={t.agentsKicker} title={t.agentsTitle} sub={t.agentsSub} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {t.agents.map((agent, i) => {
          const Icon = AGENT_ICONS[i % AGENT_ICONS.length];
          return (
            <Reveal key={agent.name} delay={40 + i * 40} className="h-full">
              <div className="agent-card panel lift group flex h-full flex-col gap-3 p-4" style={{ "--i": i } as CSSProperties}>
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[2px] bg-chart-100 text-chart-600 transition-colors duration-300 group-hover:bg-chart-600 group-hover:text-paper-50">
                    <Icon size={16} />
                  </span>
                  <span className="pulse-dot bg-risk-low text-risk-low" title="active" />
                </div>
                <div>
                  <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ink-400">
                    Agent {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-1 font-display text-[14.5px] font-bold leading-snug text-ink-900">
                    {agent.name}
                  </h3>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-600">{agent.line}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* how it decides — the differentiator */}
      <SectionHeading id="lp-pipeline" kicker={t.pipelineKicker} title={t.pipelineTitle} sub={t.pipelineSub} />
      <Reveal delay={120}>
        <div className="mt-6">
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => onEnter("system")}
              className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-chart-600 underline decoration-dashed underline-offset-4 transition-colors hover:text-ink-900"
            >
              {t.watchLive}
            </button>
          </div>
          <div className="pipe-track relative grid gap-4 sm:grid-cols-4">
            {t.phases.map((p, i) => (
              <div key={p.t} className={`pipe-step pipe-step-${i} panel lift group relative px-4 pb-4 pt-10`}>
                <span className="pipe-num">{i + 1}</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[17px] font-bold text-ink-900">{p.t}</span>
                  {i === 1 && <span className="font-mono text-[9px] font-bold text-chart-700">∥ 5</span>}
                </div>
                <p className="mt-1.5 text-[12px] italic leading-snug text-ink-500">{p.n}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* trust — why the numbers can be believed */}
      <SectionHeading id="lp-trust" kicker={t.trustKicker} title={t.trustTitle} />
      <div id="lp-trust-grid" className="mt-6 grid gap-4 md:grid-cols-3">
        {t.trustCards.map((card, i) => {
          const Icon = [LockGlyph, CheckGlyph, SpeakerGlyph][i];
          return (
            <Reveal key={card.title} delay={i * 110} from="zoom" className="h-full">
              <div className="trust-card panel lift flex h-full flex-col gap-3 p-4" style={{ "--i": i } as CSSProperties}>
                <span className="tc-icon grid h-9 w-9 shrink-0 place-items-center rounded-[2px] bg-chart-100 text-chart-600">
                  <Icon size={16} />
                </span>
                <h3 className="font-display text-[15px] font-bold leading-snug text-ink-900">{card.title}</h3>
                <p className="text-[12.5px] leading-relaxed text-ink-600">{card.body}</p>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* closing CTA — one more push before the footer */}
      <Reveal delay={140}>
        <div className="cta-ocean panel relative mt-10 flex flex-col items-center gap-4 overflow-hidden px-6 py-14 text-center">
          <span className="cta-spin" aria-hidden />
          <span className="cta-fill" aria-hidden>
            <span className="cta-beam" />
            <span className="cta-flash" />
          </span>
          <span className="cta-bubble cta-bubble-1" aria-hidden />
          <span className="cta-bubble cta-bubble-2" aria-hidden />
          <span className="cta-bubble cta-bubble-3" aria-hidden />
          <span className="cta-bubble cta-bubble-4" aria-hidden />
          <h2 className="relative z-10 font-display text-[24px] font-black leading-tight text-ink-900 sm:text-[28px]">
            {t.closingTitle}
          </h2>
          <p className="relative z-10 max-w-[440px] text-[13.5px] leading-relaxed text-ink-500">{t.closingSub}</p>
          <div className="relative z-10 mt-2 flex flex-wrap items-center justify-center gap-3">
            <button onClick={onTour} className="btn-line !px-5 !py-2.5">
              <PlayGlyph size={11} /> {t.ctaTour}
            </button>
            <button onClick={() => onEnter("home")} className="btn-ink group !px-5 !py-2.5">
              {t.ctaOpen} <CourseArrow size={13} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </Reveal>

      {/* ================= FOOTER ================= */}
      <Reveal delay={980}>
        <footer className="relative mt-14 border-t pt-10" style={{ borderColor: "var(--rule)" }}>
          <div className="grid gap-9 pb-8 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            {/* brand */}
            <div>
              <BrandLogo />
              <p className="mt-3 max-w-[230px] text-[12.5px] leading-relaxed text-ink-500">{t.footerTagline}</p>
              <span
                className="mt-4 inline-block rounded-[2px] border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-400"
                style={{ borderColor: "var(--rule)" }}
              >
                {t.kicker}
              </span>
            </div>

            {/* product */}
            <div>
              <div className="label !text-ink-900">{t.footerProductHeading}</div>
              <ul className="mt-3 space-y-2.5">
                {[t.cards[0].kicker, t.cards[1].kicker, t.cards[2].kicker, t.footerSystemLabel].map((label, i) => {
                  const Icon = FOOTER_PRODUCT_ICONS[i];
                  return (
                    <li key={label}>
                      <button
                        onClick={() => onEnter((["home", "ask", "authority", "system"] as const)[i])}
                        className="group flex items-center gap-2 text-[12.5px] text-ink-500 transition-colors hover:text-chart-600"
                      >
                        <Icon size={13} strokeWidth={1.75} className="shrink-0 text-ink-300 transition-colors group-hover:text-chart-500" />
                        <span className="transition-transform group-hover:translate-x-0.5">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* explore — anchors to the sections on this page */}
            <div>
              <div className="label !text-ink-900">{t.footerExploreHeading}</div>
              <ul className="mt-3 space-y-2.5">
                {[
                  { label: t.navFeatures, id: "lp-features" },
                  { label: t.navHow, id: "lp-pipeline" },
                  { label: t.footerAgentsLabel, id: "lp-agents" },
                  { label: t.footerTrustLabel, id: "lp-trust" },
                ].map((x, i) => {
                  const Icon = FOOTER_EXPLORE_ICONS[i];
                  return (
                    <li key={x.id}>
                      <button
                        onClick={() => document.getElementById(x.id)?.scrollIntoView({ behavior: "smooth" })}
                        className="group flex items-center gap-2 text-[12.5px] text-ink-500 transition-colors hover:text-chart-600"
                      >
                        <Icon size={13} strokeWidth={1.75} className="shrink-0 text-ink-300 transition-colors group-hover:text-chart-500" />
                        <span className="transition-transform group-hover:translate-x-0.5">{x.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* connect */}
            <div>
              <div className="label !text-ink-900">{t.footerConnectHeading}</div>
              <ul className="mt-3 space-y-2.5">
                <li>
                  <button
                    onClick={onTour}
                    className="group flex items-center gap-2 text-[12.5px] text-ink-500 transition-colors hover:text-chart-600"
                  >
                    <PlayGlyph size={9} className="shrink-0 text-ink-300 transition-colors group-hover:text-chart-500" />
                    <span className="transition-transform group-hover:translate-x-0.5">{t.footerTourLabel}</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => (window.location.href = `/?m=1&lang=${language}`)}
                    className="group flex items-center gap-2 text-[12.5px] text-ink-500 transition-colors hover:text-chart-600"
                  >
                    <PhoneGlyph size={11} className="shrink-0 text-ink-300 transition-colors group-hover:text-chart-500" />
                    <span className="transition-transform group-hover:translate-x-0.5">{t.ctaPhone}</span>
                  </button>
                </li>
                <li>
                  <a
                    href="https://github.com/akshatog/MARVO"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-2 text-[12.5px] text-ink-500 transition-colors hover:text-chart-600"
                  >
                    <GithubGlyph size={12} className="shrink-0 text-ink-300 transition-colors group-hover:text-chart-500" />
                    <span className="transition-transform group-hover:translate-x-0.5">GitHub</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* bottom bar — disclaimer, language, repo link */}
          <div
            className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "var(--rule-faint)" }}
          >
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-500">{t.footer}</span>
            <div className="flex items-center gap-4">
              {/* language — lives here, not in the navbar: it's a set-once
                  preference, not something reached for on every visit */}
              <span className="flex gap-1">
                {(["en", "hi", "mr"] as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => onLanguage(l)}
                    className={`rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] font-bold transition ${
                      language === l
                        ? "border-ink-900 bg-ink-900 text-paper-50"
                        : "text-ink-500 hover:text-ink-800"
                    }`}
                    style={language === l ? undefined : { borderColor: "var(--rule)" }}
                  >
                    {l === "en" ? "EN" : l === "hi" ? "हिं" : "मरा"}
                  </button>
                ))}
              </span>
              <a
                href="https://github.com/akshatog/MARVO"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-chart-600 transition-colors hover:text-ink-900"
              >
                https://github.com/akshatog/MARVO
              </a>
            </div>
          </div>

          {/* copyright strip + back to top */}
          <div className="relative flex items-center justify-center pb-4 pt-4">
            <span className="text-center font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">
              © {new Date().getFullYear()} MARVO · Built for {t.kicker}
            </span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
              className="group absolute right-0 flex items-center gap-1 rounded-[2px] border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-500 transition-colors hover:border-ink-900 hover:text-ink-900"
              style={{ borderColor: "var(--rule)" }}
            >
              <ArrowUp size={11} strokeWidth={1.75} className="transition-transform group-hover:-translate-y-0.5" />
              Top
            </button>
          </div>
        </footer>
      </Reveal>
    </div>
    </>
  );
}
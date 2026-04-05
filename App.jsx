import { useState, useEffect } from "react";

// ── 天文計算 ──────────────────────────────────────────
const DEG = Math.PI / 180;

function julianDay(year, month, day, hour = 12) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hour / 24 + B - 1524.5;
}

function sunLongitude(jd) {
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * DEG;
  const lambda = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  return ((lambda % 360) + 360) % 360;
}

function moonLongitude(jd) {
  const n = jd - 2451545.0;
  const L = (218.316 + 13.176396 * n) % 360;
  const M = ((134.963 + 13.064993 * n) % 360) * DEG;
  const F = ((93.272 + 13.229350 * n) % 360) * DEG;
  const lambda = L + 6.289 * Math.sin(M) - 1.274 * Math.sin(2 * F - M) + 0.658 * Math.sin(2 * F);
  return ((lambda % 360) + 360) % 360;
}

function planetLongitudes(jd) {
  const T = (jd - 2451545.0) / 36525;
  return {
    mercury: ((252.250906 + 149472.6746358 * T) % 360 + 360) % 360,
    venus:   ((181.979801 + 58517.8156760  * T) % 360 + 360) % 360,
    mars:    ((355.433275 + 19140.2993313  * T) % 360 + 360) % 360,
    jupiter: ((34.351519  + 3034.9056606   * T) % 360 + 360) % 360,
    saturn:  ((50.077444  + 1222.1137943   * T) % 360 + 360) % 360,
    uranus:  ((314.055005 + 428.4669983    * T) % 360 + 360) % 360,
    neptune: ((304.348665 + 218.4862002    * T) % 360 + 360) % 360,
  };
}

function ascendant(jd, lat, lng) {
  const T = (jd - 2451545.0) / 36525;
  const GMST = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T;
  const LST = ((GMST + lng) % 360 + 360) % 360;
  const E = 23.439291 - 0.013004 * T;
  const tanASC = -Math.cos(LST * DEG) / (Math.sin(E * DEG) * Math.tan(lat * DEG) + Math.cos(E * DEG) * Math.sin(LST * DEG));
  let asc = Math.atan(tanASC) / DEG;
  if (Math.cos(LST * DEG) < 0) asc += 180;
  return ((asc % 360) + 360) % 360;
}

// ── 星座データ ─────────────────────────────────────────
const SIGNS = [
  { name:"牡羊座", en:"Aries",       symbol:"♈", start:0,   color:"#e53935", element:"火" },
  { name:"牡牛座", en:"Taurus",      symbol:"♉", start:30,  color:"#43a047", element:"土" },
  { name:"双子座", en:"Gemini",      symbol:"♊", start:60,  color:"#fdd835", element:"風" },
  { name:"蟹座",   en:"Cancer",      symbol:"♋", start:90,  color:"#e0e0e0", element:"水" },
  { name:"獅子座", en:"Leo",         symbol:"♌", start:120, color:"#ff8f00", element:"火" },
  { name:"乙女座", en:"Virgo",       symbol:"♍", start:150, color:"#7cb342", element:"土" },
  { name:"天秤座", en:"Libra",       symbol:"♎", start:180, color:"#26c6da", element:"風" },
  { name:"蠍座",   en:"Scorpio",     symbol:"♏", start:210, color:"#6a1b9a", element:"水" },
  { name:"射手座", en:"Sagittarius", symbol:"♐", start:240, color:"#ef6c00", element:"火" },
  { name:"山羊座", en:"Capricorn",   symbol:"♑", start:270, color:"#546e7a", element:"土" },
  { name:"水瓶座", en:"Aquarius",    symbol:"♒", start:300, color:"#1e88e5", element:"風" },
  { name:"魚座",   en:"Pisces",      symbol:"♓", start:330, color:"#00897b", element:"水" },
];

function getSign(deg) {
  const d = ((deg % 360) + 360) % 360;
  return SIGNS[Math.floor(d / 30)];
}

const PLANET_INFO = {
  sun:     { label:"☀️ 太陽",  color:"#FFD700" },
  moon:    { label:"🌙 月",    color:"#C0C0C0" },
  mercury: { label:"☿ 水星",  color:"#B0BEC5" },
  venus:   { label:"♀ 金星",  color:"#F48FB1" },
  mars:    { label:"♂ 火星",  color:"#EF5350" },
  jupiter: { label:"♃ 木星",  color:"#FFA726" },
  saturn:  { label:"♄ 土星",  color:"#8D6E63" },
  uranus:  { label:"⛢ 天王星", color:"#80DEEA" },
  neptune: { label:"♆ 海王星", color:"#7986CB" },
  asc:     { label:"↑ ASC",   color:"#FFFFFF" },
};

// ── 言語データ ─────────────────────────────────────────
const LANG = {
  ja: {
    appTitle:"AI ホロスコープ", appSub:"星があなたの物語を語る",
    lead:"生年月日を入力してください",
    labelName:"お名前（ニックネームOK）", placeholderName:"例：恵子",
    labelBirth:"生年月日",
    placeholderYear:"1966", placeholderMonth:"7", placeholderDay:"11",
    labelHour:"出生時刻（わからなければ12時のまま）", hourHint:"時（0〜23）",
    labelLocation:"出生地（主要都市を選ぶか緯度経度を入力）",
    latPlaceholder:"緯度 例: 35.6762", lngPlaceholder:"経度 例: 139.6503",
    yearMonthDay:"年 ／ 月 ／ 日",
    btn:"🌌 ホロスコープを鑑定する", loading:"星を読んでいます...",
    errRequired:"名前と生年月日を入力してください", errRetry:"もう一度お試しください",
    resultSuffix:"さんのホロスコープ",
    tabChart:"🌌 チャート", tabReading:"✨ 鑑定", tabToday:"☀️ 今日", tabShare:"📲 シェア",
    sunLabel:"太陽", moonLabel:"月", ascLabel:"ASC",
    planetTitle:"惑星配置",
    sections:[
      {head:"✨ 魂の本質・人生の目的", key:"essence"},
      {head:"🌟 性格・才能・強み",     key:"personality"},
      {head:"♡ 恋愛・人間関係",       key:"love"},
      {head:"⭐ 仕事・使命・天職",     key:"career"},
      {head:"🔥 成長のテーマ",         key:"challenge"},
    ],
    todayHead:"☀️ 今日の運勢", luckyHead:"🌟 ラッキー",
    messageHead:"💫 天からのメッセージ",
    snsHead:"📱 SNS投稿用キャプション", shareHead:"📲 シェアする",
    copy:"📋 コピーする", copied:"✓ コピー済み",
    reset:"← 別の人を鑑定する",
    footer:"🌌 AI Horoscope ✦ powered by Claude",
    cities:[
      {name:"東京",       lat:35.6762,  lng:139.6503},
      {name:"大阪",       lat:34.6937,  lng:135.5023},
      {name:"名古屋",     lat:35.1815,  lng:136.9066},
      {name:"福岡",       lat:33.5904,  lng:130.4017},
      {name:"札幌",       lat:43.0618,  lng:141.3545},
      {name:"ニューヨーク",lat:40.7128, lng:-74.0060},
      {name:"ロンドン",   lat:51.5074,  lng:-0.1278},
      {name:"パリ",       lat:48.8566,  lng:2.3522},
    ],
    buildPrompt:(name, sunSign, moonSign, ascSign, planetDesc) =>
      `あなたは本格的な西洋占星術師です。以下のホロスコープデータをもとに、${name}さんへの詳細な鑑定を行ってください。
【基本データ】
- 太陽星座：${sunSign.name}（${sunSign.en}）
- 月星座：${moonSign.name}
- アセンダント：${ascSign.name}
【惑星配置】
${planetDesc}
【出力形式】（必ずこの形式・日本語）
TITLE: （20文字以内の印象的なタイトル）
ESSENCE: （この人の本質・魂の目的。150文字）
PERSONALITY: （性格・才能・強み。150文字）
LOVE: （恋愛・人間関係の傾向。100文字）
CAREER: （仕事・使命・天職。100文字）
CHALLENGE: （課題・成長のテーマ。100文字）
TODAY: （今日の運勢とアドバイス。100文字）
LUCKY: （ラッキーカラー・アイテム・数字。30文字）
MESSAGE: （天からの愛のメッセージ。80文字）
SNS: （X投稿用キャプション。絵文字たっぷり・共感性高く・120文字以内）`,
  },
  en: {
    appTitle:"AI Horoscope", appSub:"The stars tell your story",
    lead:"Enter your birth details",
    labelName:"Your name (nickname OK)", placeholderName:"e.g. Keiko",
    labelBirth:"Date of birth",
    placeholderYear:"1966", placeholderMonth:"7", placeholderDay:"11",
    labelHour:"Birth time (leave as 12 if unknown)", hourHint:"hour (0–23)",
    labelLocation:"Birthplace (select a city or enter coordinates)",
    latPlaceholder:"Latitude e.g. 35.6762", lngPlaceholder:"Longitude e.g. 139.6503",
    yearMonthDay:"Year / Month / Day",
    btn:"🌌 Read My Horoscope", loading:"Reading the stars...",
    errRequired:"Please enter your name and date of birth", errRetry:"Please try again",
    resultSuffix:"'s Horoscope",
    tabChart:"🌌 Chart", tabReading:"✨ Reading", tabToday:"☀️ Today", tabShare:"📲 Share",
    sunLabel:"Sun", moonLabel:"Moon", ascLabel:"ASC",
    planetTitle:"Planetary Positions",
    sections:[
      {head:"✨ Soul Essence & Life Purpose", key:"essence"},
      {head:"🌟 Personality & Strengths",     key:"personality"},
      {head:"♡ Love & Relationships",         key:"love"},
      {head:"⭐ Career & Calling",            key:"career"},
      {head:"🔥 Growth & Challenges",         key:"challenge"},
    ],
    todayHead:"☀️ Today's Forecast", luckyHead:"🌟 Lucky",
    messageHead:"💫 Message from the Universe",
    snsHead:"📱 Caption for SNS", shareHead:"📲 Share",
    copy:"📋 Copy", copied:"✓ Copied!",
    reset:"← Read another chart",
    footer:"🌌 AI Horoscope ✦ powered by Claude",
    cities:[
      {name:"Tokyo",     lat:35.6762,  lng:139.6503},
      {name:"Osaka",     lat:34.6937,  lng:135.5023},
      {name:"New York",  lat:40.7128,  lng:-74.0060},
      {name:"London",    lat:51.5074,  lng:-0.1278},
      {name:"Paris",     lat:48.8566,  lng:2.3522},
      {name:"Sydney",    lat:-33.8688, lng:151.2093},
      {name:"Dubai",     lat:25.2048,  lng:55.2708},
      {name:"Singapore", lat:1.3521,   lng:103.8198},
    ],
    buildPrompt:(name, sunSign, moonSign, ascSign, planetDesc) =>
      `You are a professional Western astrologer. Please provide a detailed horoscope reading for ${name} based on the following chart data.
[Chart Data]
- Sun sign: ${sunSign.name} (${sunSign.en})
- Moon sign: ${moonSign.name} (${moonSign.en})
- Ascendant: ${ascSign.name} (${ascSign.en})
[Planetary positions]
${planetDesc}
[Output format] (Use EXACTLY these keys, respond in English)
TITLE: (impressive title, max 8 words)
ESSENCE: (soul essence and life purpose, 80–100 words)
PERSONALITY: (personality, talents and strengths, 80–100 words)
LOVE: (love and relationship tendencies, 50–60 words)
CAREER: (career, mission and calling, 50–60 words)
CHALLENGE: (growth themes and challenges, 50–60 words)
TODAY: (today's forecast and advice, 50–60 words)
LUCKY: (lucky color, item and number, max 10 words)
MESSAGE: (loving message from the universe, max 40 words)
SNS: (X/Instagram caption, lots of emojis, relatable, max 60 words)`,
  },
};

// ── ホロスコープチャート描画 ──────────────────────────────
function HoroscopeChart({ planets, ascDeg }) {
  const size = 340;
  const cx = size / 2, cy = size / 2;
  const R = 140, r1 = 120, r2 = 100, r3 = 80;

  function degToXY(deg, radius) {
    const a = (deg - 90 - ascDeg) * DEG;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  }

  return (
    <svg width={size} height={size} style={{ display:"block", margin:"0 auto" }}>
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#1a0533" />
          <stop offset="100%" stopColor="#0a0118" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={R+10} fill="url(#bgGrad)" />
      {SIGNS.map((sign, i) => {
        const p1 = degToXY(sign.start, r2);
        const p2 = degToXY(sign.start, R);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />;
      })}
      <circle cx={cx} cy={cy} r={R}  fill="none" stroke="rgba(212,175,55,0.5)" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r3} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={20} fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth="0.5" />
      {Array.from({length:12}, (_,i) => {
        const p1 = degToXY(i*30, 20);
        const p2 = degToXY(i*30, r2);
        return <line key={`h${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />;
      })}
      {SIGNS.map((sign, i) => {
        const p = degToXY(sign.start + 15, (R + r1) / 2);
        return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={sign.color} filter="url(#glow)" fontFamily="serif">{sign.symbol}</text>;
      })}
      {(() => {
        const p1 = degToXY(0, r3);
        const p2 = degToXY(0, R + 8);
        return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#fff" strokeWidth="2" filter="url(#glow)" />;
      })()}
      {Object.entries(planets).map(([key, deg]) => {
        if (key === "asc") return null;
        const info = PLANET_INFO[key];
        const p = degToXY(deg, r3 - 5);
        return (
          <g key={key}>
            <circle cx={p.x} cy={p.y} r={10} fill="rgba(0,0,0,0.6)" stroke={info.color} strokeWidth="1.5" filter="url(#glow)" />
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={info.color}>{info.label.split(" ")[0]}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={4} fill="#d4af37" filter="url(#glow)" />
    </svg>
  );
}

// ── メインアプリ ───────────────────────────────────────
export default function HoroscopeApp() {
  const [lang, setLang]           = useState("ja");
  const [form, setForm]           = useState({ name:"", year:"", month:"", day:"", hour:"12", lat:"35.6762", lng:"139.6503" });
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [show, setShow]           = useState(false);
  const [activeTab, setActiveTab] = useState("chart");
  const [copied, setCopied]       = useState(false);

  const L = LANG[lang];

  useEffect(() => {
    if (result) setTimeout(() => setShow(true), 100);
    else setShow(false);
  }, [result]);

  function switchLang(l) { setLang(l); setResult(null); setError(""); }

  function calcChart() {
    const { year, month, day, hour, lat, lng } = form;
    const jd      = julianDay(+year, +month, +day, +hour);
    const sunDeg  = sunLongitude(jd);
    const moonDeg = moonLongitude(jd);
    const pDeg    = planetLongitudes(jd);
    const ascDeg  = ascendant(jd, +lat, +lng);
    return {
      jd,
      planets: { sun:sunDeg, moon:moonDeg, ...pDeg, asc:ascDeg },
      ascDeg,
      sunSign:  getSign(sunDeg),
      moonSign: getSign(moonDeg),
      ascSign:  getSign(ascDeg),
    };
  }

  async function handleSubmit() {
    if (!form.name || !form.year || !form.month || !form.day) { setError(L.errRequired); return; }
    setError(""); setResult(null); setLoading(true);
    try {
      const chart = calcChart();
      const planetDesc = Object.entries(chart.planets)
        .filter(([k]) => k !== "asc")
        .map(([k, v]) => {
          const sign = getSign(v);
          return lang === "ja"
            ? `${PLANET_INFO[k]?.label || k}：${sign.name}${(v % 30).toFixed(1)}°`
            : `${PLANET_INFO[k]?.label || k}: ${sign.en} ${(v % 30).toFixed(1)}°`;
        }).join(lang === "ja" ? "、" : ", ");

      const prompt = L.buildPrompt(form.name, chart.sunSign, chart.moonSign, chart.ascSign, planetDesc);

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:2000, messages:[{ role:"user", content:prompt }] }),
      });
      const data = await res.json();
      const text = data.content[0].text;
      const get = (key) => { const m = text.match(new RegExp(`${key}:\\s*(.+)`)); return m ? m[1].trim() : ""; };
      setResult({
        chart, name:form.name,
        title:get("TITLE"), essence:get("ESSENCE"), personality:get("PERSONALITY"),
        love:get("LOVE"), career:get("CAREER"), challenge:get("CHALLENGE"),
        today:get("TODAY"), lucky:get("LUCKY"), message:get("MESSAGE"), sns:get("SNS"),
      });
      setActiveTab("chart");
    } catch { setError(L.errRetry); }
    finally { setLoading(false); }
  }

  function copySNS() {
    if (!result?.sns) return;
    navigator.clipboard.writeText(result.sns).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const TABS = [
    { id:"chart",   label:L.tabChart   },
    { id:"reading", label:L.tabReading },
    { id:"today",   label:L.tabToday   },
    { id:"share",   label:L.tabShare   },
  ];

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes twinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
        .inp:focus { outline:none; border-color:#d4af37 !important; box-shadow:0 0 0 2px rgba(212,175,55,0.2) !important; }
        .tab-btn:hover { background:rgba(212,175,55,0.1) !important; }
        .tab-on { background:rgba(212,175,55,0.15) !important; color:#d4af37 !important; border-bottom:2px solid #d4af37 !important; }
        .btn-gold:hover { background:#b8870a !important; transform:translateY(-1px); }
        .btn-reset:hover { color:#d4af37 !important; }
        .city-btn:hover { background:rgba(212,175,55,0.15) !important; border-color:#d4af37 !important; }
        .lang-btn { cursor:pointer; padding:5px 12px; border-radius:20px; border:1px solid rgba(212,175,55,0.35); font-size:12px; font-weight:700; transition:all 0.2s; background:transparent; font-family:'Noto Sans JP',sans-serif; color:rgba(212,175,55,0.6); }
        .lang-on { background:rgba(212,175,55,0.15) !important; color:#d4af37 !important; border-color:#d4af37 !important; }
      `}</style>

      {/* 星パーティクル */}
      <div style={s.stars}>
        {Array.from({length:40},(_,i)=>(
          <div key={i} style={{ position:"absolute", borderRadius:"50%", background:"white", width:Math.random()*2+0.5, height:Math.random()*2+0.5, left:`${Math.random()*100}%`, top:`${Math.random()*100}%`, animation:`twinkle ${Math.random()*4+2}s ${Math.random()*4}s ease-in-out infinite` }}/>
        ))}
      </div>

      {/* ヘッダー */}
      <div style={s.header}>
        <div style={{position:"absolute", top:16, right:16, display:"flex", gap:6}}>
          <button className={`lang-btn ${lang==="ja"?"lang-on":""}`} onClick={()=>switchLang("ja")}>🇯🇵 JP</button>
          <button className={`lang-btn ${lang==="en"?"lang-on":""}`} onClick={()=>switchLang("en")}>🇬🇧 EN</button>
        </div>
        <div style={s.headerIcon}>🌌</div>
        <h1 style={s.title}>{L.appTitle}</h1>
        <p style={s.sub}>{L.appSub}</p>
      </div>

      <div style={s.body}>
        {!result ? (
          <div style={s.card}>
            <p style={s.lead}>{L.lead}</p>
            <div style={s.field}>
              <label style={s.label}>{L.labelName}</label>
              <input className="inp" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={L.placeholderName} style={s.inp} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{L.labelBirth}</label>
              <div style={{display:"flex", gap:8}}>
                <input className="inp" type="number" value={form.year}  onChange={e=>setForm({...form,year:e.target.value})}  placeholder={L.placeholderYear}  style={{...s.inp,flex:2}} />
                <input className="inp" type="number" value={form.month} onChange={e=>setForm({...form,month:e.target.value})} placeholder={L.placeholderMonth} min="1" max="12" style={{...s.inp,flex:1}} />
                <input className="inp" type="number" value={form.day}   onChange={e=>setForm({...form,day:e.target.value})}   placeholder={L.placeholderDay}   min="1" max="31" style={{...s.inp,flex:1}} />
              </div>
              <p style={s.hint}>{L.yearMonthDay}</p>
            </div>
            <div style={s.field}>
              <label style={s.label}>{L.labelHour}</label>
              <input className="inp" type="number" value={form.hour} onChange={e=>setForm({...form,hour:e.target.value})} placeholder="12" min="0" max="23" style={{...s.inp,width:100}} />
              <span style={{...s.hint,display:"inline",marginLeft:8}}>{L.hourHint}</span>
            </div>
            <div style={s.field}>
              <label style={s.label}>{L.labelLocation}</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                {L.cities.map(c=>(
                  <button key={c.name} className="city-btn"
                    onClick={()=>setForm({...form,lat:String(c.lat),lng:String(c.lng)})}
                    style={{...s.cityBtn, background:form.lat===String(c.lat)?"rgba(212,175,55,0.2)":"rgba(255,255,255,0.05)", borderColor:form.lat===String(c.lat)?"#d4af37":"rgba(212,175,55,0.25)", color:form.lat===String(c.lat)?"#d4af37":"rgba(255,255,255,0.6)"}}>
                    {c.name}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <input className="inp" value={form.lat} onChange={e=>setForm({...form,lat:e.target.value})} placeholder={L.latPlaceholder} style={{...s.inp,flex:1}} />
                <input className="inp" value={form.lng} onChange={e=>setForm({...form,lng:e.target.value})} placeholder={L.lngPlaceholder} style={{...s.inp,flex:1}} />
              </div>
            </div>
            {error && <p style={s.error}>⚠️ {error}</p>}
            <button className="btn-gold" onClick={handleSubmit} disabled={loading} style={s.btnMain}>
              {loading ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span style={s.spinner}/>{L.loading}</span> : L.btn}
            </button>
          </div>
        ) : (
          <div style={{opacity:show?1:0, transform:show?"translateY(0)":"translateY(20px)", transition:"all 0.6s ease"}}>
            <div style={s.resultHeader}>
              <div style={s.resultName}>{result.name}{L.resultSuffix}</div>
              <div style={s.resultTitle}>{result.title}</div>
              <div style={s.signRow}>
                {[{sign:result.chart.sunSign,label:L.sunLabel},{sign:result.chart.moonSign,label:L.moonLabel},{sign:result.chart.ascSign,label:L.ascLabel}].map(({sign,label})=>(
                  <div key={label} style={s.signBadge}>
                    <span style={{fontSize:24}}>{sign.symbol}</span>
                    <span style={s.signLabel}>{label}</span>
                    <span style={s.signName}>{lang==="ja" ? sign.name : sign.en}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={s.tabBar}>
              {TABS.map(t=>(
                <button key={t.id} className={`tab-btn ${activeTab===t.id?"tab-on":""}`} onClick={()=>setActiveTab(t.id)} style={s.tabBtn}>{t.label}</button>
              ))}
            </div>

            {activeTab==="chart" && (
              <div style={s.card}>
                <HoroscopeChart planets={result.chart.planets} ascDeg={result.chart.ascDeg} />
                <div style={{marginTop:20}}>
                  <p style={s.sectionHead}>{L.planetTitle}</p>
                  <div style={s.planetGrid}>
                    {Object.entries(result.chart.planets).map(([key,deg])=>{
                      const info = PLANET_INFO[key];
                      const sign = getSign(deg);
                      return (
                        <div key={key} style={s.planetItem}>
                          <span style={{color:info.color,fontSize:16}}>{info.label.split(" ")[0]}</span>
                          <span style={s.planetName}>{info.label.split(" ").slice(1).join(" ")}</span>
                          <span style={s.planetSign}>{sign.symbol} {lang==="ja"?sign.name:sign.en}</span>
                          <span style={s.planetDeg}>{(deg%30).toFixed(1)}°</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab==="reading" && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {[
                  {head:L.sections[0].head, text:result.essence,     bg:"rgba(212,175,55,0.08)"},
                  {head:L.sections[1].head, text:result.personality, bg:"rgba(100,150,255,0.08)"},
                  {head:L.sections[2].head, text:result.love,        bg:"rgba(255,100,150,0.08)"},
                  {head:L.sections[3].head, text:result.career,      bg:"rgba(100,200,100,0.08)"},
                  {head:L.sections[4].head, text:result.challenge,   bg:"rgba(255,150,50,0.08)"},
                ].map((item,i)=>(
                  <div key={i} style={{...s.card,background:item.bg,padding:"18px 20px"}}>
                    <p style={s.sectionHead}>{item.head}</p>
                    <p style={s.bodyText}>{item.text}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab==="today" && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={s.card}><p style={s.sectionHead}>{L.todayHead}</p><p style={s.bodyText}>{result.today}</p></div>
                <div style={{...s.card,background:"rgba(212,175,55,0.08)",textAlign:"center"}}>
                  <p style={s.sectionHead}>{L.luckyHead}</p>
                  <p style={{fontSize:17,color:"#d4af37",fontWeight:700,marginTop:8}}>{result.lucky}</p>
                </div>
                <div style={{...s.card,background:"rgba(100,150,255,0.08)",textAlign:"center"}}>
                  <p style={s.sectionHead}>{L.messageHead}</p>
                  <p style={{fontSize:16,color:"#e0d5ff",lineHeight:2,marginTop:8,fontStyle:"italic"}}>{result.message}</p>
                </div>
              </div>
            )}

            {activeTab==="share" && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={s.card}>
                  <p style={s.sectionHead}>{L.snsHead}</p>
                  <p style={{fontSize:15,lineHeight:1.9,color:"rgba(255,255,255,0.85)",marginTop:10,whiteSpace:"pre-wrap"}}>{result.sns}</p>
                  <button onClick={copySNS} style={{...s.btnSub,marginTop:14}}>{copied?L.copied:L.copy}</button>
                </div>
                <div style={s.card}>
                  <p style={s.sectionHead}>{L.shareHead}</p>
                  <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>
                    <button onClick={()=>window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(result.sns)}`,"_blank")} style={{...s.shareBtn,background:"#000"}}>𝕏 X</button>
                    <button onClick={()=>window.open(`https://line.me/R/msg/text/?${encodeURIComponent(result.sns)}`,"_blank")} style={{...s.shareBtn,background:"#06C755"}}>💬 LINE</button>
                    {navigator.share && <button onClick={()=>navigator.share({title:`${result.name}${L.resultSuffix}`,text:result.sns})} style={{...s.shareBtn,background:"#d4af37",color:"#1a0533"}}>↑ Share</button>}
                  </div>
                </div>
              </div>
            )}

            <button className="btn-reset" onClick={()=>{setResult(null);setShow(false);}} style={s.btnReset}>{L.reset}</button>
          </div>
        )}
        <p style={s.footer}>{L.footer}</p>
      </div>
    </div>
  );
}

/* ── スタイル ── */
const s = {
  root:{ minHeight:"100vh", background:"linear-gradient(160deg,#0d0221 0%,#130635 40%,#0a0118 100%)", fontFamily:"'Noto Sans JP',sans-serif", color:"#fff", position:"relative", overflow:"hidden" },
  stars:{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 },
  header:{ position:"relative", zIndex:1, padding:"40px 20px 28px", textAlign:"center", borderBottom:"1px solid rgba(212,175,55,0.2)" },
  headerIcon:{ fontSize:48, display:"block", marginBottom:10, animation:"float 4s ease-in-out infinite" },
  title:{ fontFamily:"'Cinzel Decorative',serif", fontSize:24, fontWeight:700, color:"#d4af37", marginBottom:6, letterSpacing:"0.1em" },
  sub:{ fontSize:13, color:"rgba(212,175,55,0.6)", letterSpacing:"0.15em" },
  body:{ position:"relative", zIndex:1, maxWidth:480, margin:"0 auto", padding:"20px 16px 48px" },
  card:{ background:"rgba(255,255,255,0.04)", borderRadius:20, padding:"24px 20px", border:"1px solid rgba(212,175,55,0.2)", marginBottom:12, backdropFilter:"blur(10px)" },
  lead:{ fontSize:16, fontWeight:700, color:"rgba(255,255,255,0.9)", textAlign:"center", marginBottom:20 },
  field:{ marginBottom:18 },
  label:{ fontSize:12, color:"rgba(212,175,55,0.8)", fontWeight:700, letterSpacing:"0.08em", display:"block", marginBottom:8 },
  inp:{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(212,175,55,0.3)", borderRadius:12, padding:"12px 16px", fontSize:16, fontFamily:"'Noto Sans JP',sans-serif", color:"#fff", transition:"all 0.2s" },
  hint:{ fontSize:11, color:"rgba(212,175,55,0.5)", marginTop:4 },
  cityBtn:{ padding:"6px 12px", borderRadius:20, border:"1px solid", fontSize:12, fontFamily:"'Noto Sans JP',sans-serif", cursor:"pointer", transition:"all 0.2s" },
  error:{ color:"#ff6b6b", fontSize:14, textAlign:"center", marginBottom:12, fontWeight:700 },
  btnMain:{ width:"100%", background:"#d4af37", border:"none", borderRadius:14, color:"#1a0533", fontSize:17, fontFamily:"'Noto Sans JP',sans-serif", fontWeight:900, padding:"17px", cursor:"pointer", transition:"all 0.25s", boxShadow:"0 4px 20px rgba(212,175,55,0.3)" },
  spinner:{ width:18, height:18, border:"2px solid rgba(26,5,51,0.3)", borderTop:"2px solid #1a0533", borderRadius:"50%", display:"inline-block", animation:"spin 0.8s linear infinite", flexShrink:0 },
  resultHeader:{ background:"rgba(212,175,55,0.08)", borderRadius:20, padding:"24px 20px", border:"2px solid rgba(212,175,55,0.3)", marginBottom:12, textAlign:"center" },
  resultName:{ fontSize:13, color:"rgba(212,175,55,0.7)", letterSpacing:"0.1em", marginBottom:6 },
  resultTitle:{ fontFamily:"'Cinzel',serif", fontSize:20, color:"#d4af37", fontWeight:600, marginBottom:16, lineHeight:1.5 },
  signRow:{ display:"flex", justifyContent:"center", gap:16, flexWrap:"wrap" },
  signBadge:{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"12px 16px", background:"rgba(0,0,0,0.3)", borderRadius:14, border:"1px solid rgba(212,175,55,0.2)", minWidth:80 },
  signLabel:{ fontSize:10, color:"rgba(212,175,55,0.6)", letterSpacing:"0.1em" },
  signName:{ fontSize:13, color:"#fff", fontWeight:700 },
  tabBar:{ display:"flex", background:"rgba(0,0,0,0.3)", borderRadius:12, padding:"4px", gap:4, marginBottom:12 },
  tabBtn:{ flex:1, padding:"10px 4px", fontSize:12, fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", color:"rgba(255,255,255,0.5)", background:"transparent", border:"none", borderBottom:"2px solid transparent", borderRadius:8, cursor:"pointer", transition:"all 0.2s", letterSpacing:"0.03em" },
  sectionHead:{ fontSize:13, color:"rgba(212,175,55,0.8)", fontWeight:700, letterSpacing:"0.08em", marginBottom:10 },
  bodyText:{ fontSize:15, lineHeight:2, color:"rgba(255,255,255,0.85)" },
  planetGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 },
  planetItem:{ display:"flex", alignItems:"center", gap:6, background:"rgba(0,0,0,0.2)", borderRadius:10, padding:"8px 12px" },
  planetName:{ fontSize:11, color:"rgba(255,255,255,0.5)", flex:1 },
  planetSign:{ fontSize:12, color:"rgba(255,255,255,0.8)", fontWeight:700 },
  planetDeg:{ fontSize:10, color:"rgba(212,175,55,0.6)" },
  btnSub:{ background:"rgba(212,175,55,0.15)", border:"1px solid rgba(212,175,55,0.4)", borderRadius:20, color:"#d4af37", fontSize:14, fontWeight:700, padding:"8px 20px", cursor:"pointer", fontFamily:"'Noto Sans JP',sans-serif", transition:"all 0.2s" },
  shareBtn:{ display:"flex", alignItems:"center", gap:6, padding:"12px 20px", borderRadius:14, border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Noto Sans JP',sans-serif", transition:"all 0.2s" },
  btnReset:{ background:"transparent", border:"none", color:"rgba(212,175,55,0.5)", fontSize:14, fontWeight:700, cursor:"pointer", padding:"12px 0", fontFamily:"'Noto Sans JP',sans-serif", transition:"color 0.2s", textAlign:"center", width:"100%", display:"block", marginTop:8 },
  footer:{ textAlign:"center", marginTop:40, fontSize:11, color:"rgba(212,175,55,0.3)", letterSpacing:"0.2em" },
};

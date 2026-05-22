"use client";

import Script from "next/script";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Copy,
  Download,
  Globe2,
  History,
  Link as LinkIcon,
  Loader2,
  Network,
  Rocket,
  Share2,
  ShieldCheck,
  Smartphone,
  Wifi,
  Zap,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  emptyUpdate,
  formatMetric,
  type LibreSpeedServer,
  normalizeResult,
  type SpeedtestInstance,
  type SpeedtestResult,
  type SpeedtestUpdate,
  toNumber,
  zapInfoServer,
} from "@/lib/librespeed";

const HISTORY_KEY = "zapspeed-history-v3";
type Phase = "idle" | "selecting" | "download" | "upload" | "ping" | "done" | "error";

const phaseLabel = (phase: Phase) =>
  ({
    idle: "Pronto para iniciar",
    selecting: "Buscando servidor mais rapido...",
    download: "Medindo download em tempo real",
    upload: "Medindo upload em tempo real",
    ping: "Medindo ping e jitter",
    done: "Teste concluido",
    error: "Servidor indisponivel",
  })[phase];

const phaseFromState = (state: number): Phase => (state === 1 ? "download" : state === 2 ? "ping" : state === 3 ? "upload" : state >= 4 ? "done" : "idle");
const serverLabel = (server: LibreSpeedServer) => server.displayName || server.name;

function readHistory() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as SpeedtestResult[];
  } catch {
    return [];
  }
}

function GaugeMeter({ value, phase, running }: { value: number; phase: Phase; running: boolean }) {
  const progress = Math.min(1, Math.log10(Math.max(1, value) + 1) / Math.log10(1001));
  const angle = -138 + progress * 276;
  const ticks = useMemo(() => Array.from({ length: 37 }, (_, index) => -138 + index * (276 / 36)), []);

  return (
    <div className="main-gauge">
      <svg aria-hidden="true" viewBox="0 0 420 420">
        <defs>
          <linearGradient id="gaugeArc" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ffd400" />
            <stop offset=".58" stopColor="#ffe45a" />
            <stop offset="1" stopColor="#6d7288" />
          </linearGradient>
          <filter id="gaugeGlow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path className="gauge-track" d="M 74 325 A 168 168 0 1 1 346 325" />
        <motion.path animate={{ strokeDasharray: `${progress * 610} 610` }} className="gauge-progress" d="M 74 325 A 168 168 0 1 1 346 325" filter="url(#gaugeGlow)" />
        {ticks.map((tick, index) => {
          const rad = (tick * Math.PI) / 180;
          const long = index % 6 === 0;
          return <line key={tick} stroke={long ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.28)"} strokeLinecap="round" strokeWidth={long ? 3 : 1.4} x1={210 + Math.cos(rad) * (long ? 154 : 166)} x2={210 + Math.cos(rad) * 174} y1={325 + Math.sin(rad) * (long ? 154 : 166)} y2={325 + Math.sin(rad) * 174} />;
        })}
        {[0, 1, 5, 10, 20, 30, 50, 75, 100].map((label, index) => {
          const rad = ((-138 + index * (276 / 8)) * Math.PI) / 180;
          return <text key={label} fill="white" fontSize="18" fontWeight="700" textAnchor="middle" x={210 + Math.cos(rad) * 130} y={325 + Math.sin(rad) * 130 + 6}>{label}</text>;
        })}
      </svg>
      <motion.div animate={{ rotate: angle }} className="gauge-needle" transition={{ type: "spring", stiffness: 88, damping: 18 }} />
      <span className="gauge-hub" />
      <div className="gauge-center">
        <Wifi className="mx-auto text-zap-yellow" fill="currentColor" size={44} />
        <div className="mt-3 text-lg font-black leading-none">ZAP<span className="text-zap-yellow">INFO</span></div>
        <div className="text-[9px] font-bold uppercase tracking-[.32em] text-white/60">Conectividade</div>
        <div className="mt-12 text-6xl font-light tracking-tight">{formatMetric(running ? value : value || 0)}</div>
        <div className="mt-1 text-lg text-white/70">Mbps</div>
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-zap-yellow"><ArrowDown size={17} /> {phase === "upload" ? "Upload" : "Download"}</div>
      </div>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const path = useMemo(() => {
    const data = points.length > 1 ? points : [62, 50, 56, 49, 66, 61, 76, 54, 38, 57, 78, 55, 48, 64, 56, 68];
    const max = Math.max(...data, 100);
    const min = Math.min(...data, 0);
    return data.map((point, index) => ` ${index ? "L" : "M"} ${((index / Math.max(1, data.length - 1)) * 100).toFixed(2)} ${(84 - ((point - min) / Math.max(1, max - min)) * 66).toFixed(2)}`).join("");
  }, [points]);
  return <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 92"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffd400" stopOpacity=".28" /><stop offset="1" stopColor="#ffd400" stopOpacity="0" /></linearGradient></defs><path d={`${path} L 100 92 L 0 92 Z`} fill="url(#chartFill)" /><path className="chart-line" d={path} fill="none" stroke="#ffd400" strokeLinecap="round" strokeWidth="1.8" /></svg>;
}

function Header() {
  return <header className="dash-header"><div className="brand-lockup"><div className="brand-icon"><Wifi fill="currentColor" size={26} /></div><div><div className="text-3xl font-black tracking-tight">ZAP<span className="text-zap-yellow">INFO</span></div><div className="text-[10px] font-black uppercase tracking-[.48em] text-white/75">Conectividade</div></div></div><nav className="dash-nav"><a className="active" href="#">Speed Test</a><a href="https://www.zapinfo.com.br" target="_blank" rel="noreferrer">Solucoes</a><a href="https://www.zapinfo.com.br" target="_blank" rel="noreferrer">Planos</a><a href="#servidor">Cobertura</a><a href="https://www.zapinfo.com.br" target="_blank" rel="noreferrer">Suporte</a><a href="https://www.zapinfo.com.br" target="_blank" rel="noreferrer">Sobre Nos</a></nav><a className="whatsapp-btn" href="https://wa.me/5567999999999" target="_blank" rel="noreferrer"><Smartphone size={17} /> Whatsapp</a></header>;
}

function MetricCard({ icon, label, value, unit, tone = "yellow" }: { icon: ReactNode; label: string; value: string; unit: string; tone?: "yellow" | "blue" | "cyan" | "purple" }) {
  return <div className="metric-tile"><div className={`metric-label ${tone}`}>{icon}{label}</div><div className="mt-4 flex items-end gap-2"><span className="metric-value">{value}</span><span className="pb-1 text-base text-white/62">{unit}</span></div></div>;
}

function HistoryCard({ history }: { history: SpeedtestResult[] }) {
  const rows = history.length ? history.slice(0, 3) : [
    { id: 1, time: "14:32", dlStatus: 620.45, ulStatus: 310.25, pingStatus: 5, jitterStatus: 1, packetLoss: 0, server: "ZAP Info - Bonito/MS" },
    { id: 2, time: "10:21", dlStatus: 580, ulStatus: 290, pingStatus: 7, jitterStatus: 2, packetLoss: 0, server: "ZAP Info - Bonito/MS" },
    { id: 3, time: "Ontem", dlStatus: 550, ulStatus: 280, pingStatus: 8, jitterStatus: 2, packetLoss: 0, server: "ZAP Info - Bonito/MS" },
  ];
  return <aside className="glass-card latest-card"><div className="card-head"><div className="flex items-center gap-3"><BarChart3 size={24} /> <span>Ultimos Testes</span></div><button type="button">Ver todos</button></div><div className="mt-5 space-y-2">{rows.map((item) => <div className="latest-row" key={item.id}><span className="inline-flex items-center gap-2"><ArrowDown className="text-zap-yellow" size={18} /> {formatMetric(item.dlStatus, 0)} <small>Mbps</small></span><span className="inline-flex items-center gap-2"><ArrowUp className="text-sky-400" size={18} /> {formatMetric(item.ulStatus, 0)} <small>Mbps</small></span><span className="text-sm text-white/58">{item.time}</span></div>)}</div></aside>;
}

function ServerCard({ server, servers, selectedId, setSelectedId, autoSelect, selecting }: { server: LibreSpeedServer; servers: LibreSpeedServer[]; selectedId: string; setSelectedId: (id: string) => void; autoSelect: () => void; selecting: boolean }) {
  return <aside className="glass-card server-card" id="servidor"><div className="card-head"><div className="flex items-center gap-3"><Globe2 size={26} /> <span>Servidor</span></div><button onClick={autoSelect} type="button">{selecting ? "Buscando" : "Alterar"}</button></div><div className="selected-server"><div className="text-lg font-medium text-white">{serverLabel(server)}</div><div className="mt-2 text-sm text-white/58">Brasil</div><div className="mt-3 flex items-center gap-2 text-sm text-white/70"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" /> Conectado</div></div><div className="nearby-list"><div className="mb-2 text-sm text-white/58">Servidores perto de voce:</div>{servers.slice(0, 7).map((item) => <button className={String(item.id || item.name) === selectedId ? "active" : ""} key={item.id || item.name} onClick={() => setSelectedId(String(item.id || item.name))} type="button"><strong>{item.city || "Bonito"}</strong> - {item.provider || "ZAP Info Fibra"}</button>)}</div></aside>;
}

export function ZapSpeedApp() {
  const [scriptReady, setScriptReady] = useState(false);
  const [servers, setServers] = useState<LibreSpeedServer[]>([zapInfoServer]);
  const [selectedId, setSelectedId] = useState(String(zapInfoServer.id || zapInfoServer.name));
  const [result, setResult] = useState<SpeedtestUpdate>(emptyUpdate);
  const [finalResult, setFinalResult] = useState<SpeedtestResult | null>(null);
  const [history, setHistory] = useState<SpeedtestResult[]>([]);
  const [chart, setChart] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [selectingServer, setSelectingServer] = useState(false);
  const testRef = useRef<SpeedtestInstance | null>(null);
  const server = servers.find((item) => String(item.id || item.name) === selectedId) || servers[0];
  const liveValue = phase === "upload" ? toNumber(result.ulStatus) : toNumber(result.dlStatus);
  const activeResult = finalResult || normalizeResult(result, server);

  useEffect(() => setHistory(readHistory()), []);
  useEffect(() => {
    fetch("/librespeed/server-list.json").then((response) => response.json()).then((list: LibreSpeedServer[]) => {
      const configured = process.env.NEXT_PUBLIC_LIBRESPEED_SERVERS;
      const parsed = configured ? (JSON.parse(configured) as LibreSpeedServer[]) : [];
      const nextServers = [...parsed, zapInfoServer, ...list].filter(Boolean);
      setServers(nextServers);
      setSelectedId(String(nextServers[0].id || nextServers[0].name));
    }).catch(() => undefined);
  }, []);
  useEffect(() => localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 12))), [history]);

  const autoSelectServer = useCallback(() => {
    if (!scriptReady || !window.Speedtest || servers.length < 2) return;
    setSelectingServer(true);
    setPhase("selecting");
    try {
      const selector = new window.Speedtest();
      if (!selector.addTestPoints || !selector.selectServer) {
        setSelectingServer(false);
        setPhase("idle");
        return;
      }
      selector.addTestPoints(servers);
      selector.selectServer((best) => {
        if (best) setSelectedId(String(best.id || best.name));
        setSelectingServer(false);
        setPhase("idle");
      });
    } catch {
      setSelectingServer(false);
      setPhase("idle");
    }
  }, [scriptReady, servers]);

  useEffect(() => {
    if (scriptReady && servers.length > 1) autoSelectServer();
  }, [autoSelectServer, scriptReady, servers.length]);

  const finish = useCallback((data: Partial<SpeedtestUpdate>, usedServer: LibreSpeedServer) => {
    const normalized = normalizeResult(data, usedServer);
    setFinalResult(normalized);
    setHistory((items) => [normalized, ...items].slice(0, 12));
    setResult({ ...emptyUpdate, ...data, testState: 4 });
    setPhase("done");
    setRunning(false);
  }, []);

  const startTest = useCallback(() => {
    if (running) return;
    if (!scriptReady || !window.Speedtest) {
      setPhase("error");
      return;
    }
    setRunning(true);
    setPhase("download");
    setFinalResult(null);
    setChart([]);
    setResult(emptyUpdate);
    try {
      const speed = new window.Speedtest();
      testRef.current = speed;
      let last = emptyUpdate;
      const usedServer = server;
      speed.setSelectedServer(usedServer);
      speed.setParameter("mpot", true);
      speed.setParameter("telemetry_level", "off");
      speed.setParameter("test_order", "D_U_P");
      speed.setParameter("time_auto", true);
      speed.setParameter("time_dl_max", 6);
      speed.setParameter("time_ul_max", 6);
      speed.setParameter("count_ping", 5);
      speed.setParameter("xhr_dlMultistream", 6);
      speed.setParameter("xhr_ulMultistream", 3);
      speed.onupdate = (data) => {
        last = data;
        const nextPhase = phaseFromState(data.testState);
        setPhase(nextPhase);
        setResult(data);
        setChart((points) => [...points.slice(-54), nextPhase === "upload" ? toNumber(data.ulStatus) : toNumber(data.dlStatus)]);
      };
      speed.onend = (aborted) => aborted ? (setPhase("idle"), setRunning(false)) : finish(last, usedServer);
      speed.start();
    } catch {
      setPhase("error");
      setRunning(false);
    }
  }, [finish, running, scriptReady, server]);

  const share = useCallback(async () => {
    const text = `ZapSpeed: ${formatMetric(activeResult.dlStatus)} Mbps download, ${formatMetric(activeResult.ulStatus)} Mbps upload, ping ${formatMetric(activeResult.pingStatus, 0)} ms.`;
    if (navigator.share) return void (await navigator.share({ title: "Resultado ZapSpeed", text }).catch(() => undefined));
    await navigator.clipboard?.writeText(text);
  }, [activeResult]);

  const downloadPdf = useCallback(() => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFillColor(8, 9, 18);
    doc.rect(0, 0, 595, 842, "F");
    doc.setTextColor(255, 212, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.text("ZAPINFO SPEED TEST", 48, 72);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(46);
    doc.text(`${formatMetric(activeResult.dlStatus)} Mbps`, 48, 172);
    doc.setFontSize(14);
    [["Download", `${formatMetric(activeResult.dlStatus)} Mbps`], ["Upload", `${formatMetric(activeResult.ulStatus)} Mbps`], ["Ping", `${formatMetric(activeResult.pingStatus, 0)} ms`], ["Jitter", `${formatMetric(activeResult.jitterStatus, 0)} ms`], ["Servidor", activeResult.server]].forEach(([label, value], index) => {
      const y = 250 + index * 44;
      doc.setTextColor(255, 212, 0);
      doc.text(label, 50, y);
      doc.setTextColor(255, 255, 255);
      doc.text(value, 210, y);
    });
    doc.save("zapspeed-resultado.pdf");
  }, [activeResult]);

  return (
    <>
      <Script onLoad={() => setScriptReady(true)} src="/speedtest.js" strategy="afterInteractive" />
      <main className="zap-dashboard">
        <Header />
        <section className="dashboard-grid">
          <div className="hero-copy">
            <div className="pill"><Rocket size={16} /> 19 anos de conectividade</div>
            <h1>Teste sua<br /><span>conexao agora</span></h1>
            <p>Confira a velocidade e estabilidade da sua internet em tempo real com tecnologia de ponta.</p>
            <div className="hero-actions">
              <motion.button className="start-btn" disabled={running || selectingServer} onClick={startTest} type="button" whileTap={{ scale: 0.98 }}>{running ? <Loader2 className="animate-spin" size={20} /> : null}{running ? "Testando..." : "Iniciar teste"} <span>-&gt;</span></motion.button>
              <a className="history-link" href="#historico"><History size={18} /> Historico de testes</a>
            </div>
          </div>
          <div className="gauge-wrap"><GaugeMeter phase={phase} running={running} value={liveValue || activeResult.dlStatus} /><div className="phase-line">{phaseLabel(phase)}</div></div>
          <div className="side-stack"><HistoryCard history={history} /><ServerCard autoSelect={autoSelectServer} selecting={selectingServer} selectedId={selectedId} server={server} servers={servers} setSelectedId={setSelectedId} /></div>
        </section>
        <section className="metrics-strip" id="dados">
          <MetricCard icon={<Wifi size={18} />} label="Ping" unit="ms" value={formatMetric(activeResult.pingStatus, 0)} />
          <MetricCard icon={<ArrowDown size={19} />} label="Download" unit="Mbps" value={formatMetric(activeResult.dlStatus)} />
          <MetricCard icon={<ArrowUp size={19} />} label="Upload" tone="blue" unit="Mbps" value={formatMetric(activeResult.ulStatus)} />
          <MetricCard icon={<Activity size={18} />} label="Jitter" tone="cyan" unit="ms" value={formatMetric(activeResult.jitterStatus, 0)} />
          <MetricCard icon={<Network size={18} />} label="Perda de pacotes" tone="purple" unit="%" value={formatMetric(activeResult.packetLoss, 0)} />
        </section>
        <section className="lower-grid">
          <div className="glass-card chart-card"><div className="section-title"><Activity size={24} /> Estabilidade da Conexao</div><div className="chart-area"><Sparkline points={chart} /></div></div>
          <div className="glass-card share-card"><div className="section-title"><Share2 size={22} /> Compartilhar Resultado</div><div className="share-row"><span>Gerar link</span><button onClick={share} type="button"><LinkIcon size={18} /></button><button onClick={share} type="button"><Smartphone size={18} /></button><button onClick={share} type="button"><Copy size={18} /></button></div><button className="pdf-btn" onClick={downloadPdf} type="button"><Download size={18} /> Baixar PDF</button></div>
        </section>
        <footer className="dash-footer"><span><ShieldCheck size={18} /> Fortinet Certified</span><span><span className="dot" /> 99.9% Uptime</span><span><Zap size={18} /> Rede 100% Propria</span><small>© 2026 ZAP Info Conectividade. Todos os direitos reservados.</small></footer>
      </main>
    </>
  );
}

"use client";

import Script from "next/script";
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Download,
  Gauge,
  Globe2,
  History,
  Loader2,
  Network,
  Settings,
  Share2,
  UserRound,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type ActivePanel = "results" | "settings";
type TestPhase = "idle" | "download" | "ping" | "upload" | "done" | "error";

const HISTORY_KEY = "zapspeed-history-v2";

const metricIcons: Record<string, LucideIcon> = {
  download: Gauge,
  upload: Network,
  ping: Activity,
  jitter: Wifi,
};

function phaseFromState(state: number): TestPhase {
  if (state === 1) return "download";
  if (state === 2) return "ping";
  if (state === 3) return "upload";
  if (state >= 4) return "done";
  return "idle";
}

function phaseLabel(phase: TestPhase) {
  if (phase === "download") return "Medindo download";
  if (phase === "ping") return "Medindo ping";
  if (phase === "upload") return "Medindo upload";
  if (phase === "done") return "Teste concluido";
  if (phase === "error") return "Servidor indisponivel";
  return "Pronto para iniciar";
}

function providerFromIp(clientIp?: string) {
  if (!clientIp) return "ZapInfo";
  const parts = clientIp.split(" - ");
  return parts[1] || "ZapInfo";
}

function getIpOnly(clientIp?: string) {
  if (!clientIp) return "Detectando IP...";
  return clientIp.split(" - ")[0] || clientIp;
}

function Sparkline({ points }: { points: number[] }) {
  const path = useMemo(() => {
    const data = points.length > 1 ? points : [18, 26, 22, 34, 29, 44, 37, 51, 46];
    const max = Math.max(...data, 100);
    const min = Math.min(...data, 0);
    return data
      .map((point, index) => {
        const x = (index / Math.max(1, data.length - 1)) * 100;
        const y = 80 - ((point - min) / Math.max(1, max - min)) * 64;
        return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 88">
      <defs>
        <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffd400" />
          <stop offset=".52" stopColor="#00e7ff" />
          <stop offset="1" stopColor="#ffd400" />
        </linearGradient>
        <linearGradient id="speedFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffd400" stopOpacity=".26" />
          <stop offset=".6" stopColor="#00e7ff" stopOpacity=".12" />
          <stop offset="1" stopColor="#ffd400" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L 100 88 L 0 88 Z`} fill="url(#speedFill)" />
      <path className="speed-chart-line" d={path} fill="none" stroke="url(#lineGradient)" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function MetricCard({ label, value, unit, type }: { label: string; value: string; unit: string; type: keyof typeof metricIcons }) {
  const Icon = metricIcons[type];
  return (
    <div className="result-card">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/48">
        <Icon className="text-zap-yellow" size={16} />
        {label}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-semibold tracking-tight text-white">{value}</span>
        <span className="pb-1 text-sm text-white/48">{unit}</span>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="speed-header">
      <div className="brand-mark">
        <span className="brand-gauge"><Gauge size={19} /></span>
        <div>
          <div className="text-xl font-black tracking-tight">ZAP<span className="text-zap-yellow">SPEED</span></div>
          <div className="text-[10px] font-bold uppercase tracking-[0.34em] text-white/42">by ZapInfo</div>
        </div>
      </div>
      <nav className="hidden items-center gap-9 text-[15px] font-medium text-white lg:flex">
        <button className="inline-flex items-center gap-1" type="button">Portugues <ChevronDown size={15} /></button>
        <a href="https://www.zapinfo.com.br" rel="noreferrer" target="_blank">Planos</a>
        <a href="#historico">Historico</a>
        <a href="#dados">Dados</a>
        <a href="https://www.zapinfo.com.br" rel="noreferrer" target="_blank">Sobre</a>
        <CircleHelp className="text-white/70" size={17} />
        <UserRound className="text-white/70" size={18} />
      </nav>
    </header>
  );
}

function ControlTabs({ active, setActive }: { active: ActivePanel; setActive: (panel: ActivePanel) => void }) {
  return (
    <div className="mx-auto flex items-center justify-center gap-7 text-xs font-black uppercase tracking-wide text-white/72">
      <button className={`inline-flex items-center gap-2 ${active === "results" ? "text-white" : ""}`} onClick={() => setActive("results")} type="button"><CheckCircle2 size={17} /> Resultados</button>
      <button className={`inline-flex items-center gap-2 ${active === "settings" ? "text-white" : ""}`} onClick={() => setActive("settings")} type="button"><Settings size={17} /> Configuracoes</button>
    </div>
  );
}

function StartButton({ running, phase, value, onClick }: { running: boolean; phase: TestPhase; value: number; onClick: () => void }) {
  const progress = Math.min(1, Math.max(0.03, value / 900));
  const ring = running || phase === "done" ? `${progress * 565} 565` : "565 565";

  return (
    <motion.button className="speed-start" disabled={running} onClick={onClick} type="button" whileHover={{ scale: running ? 1 : 1.025 }} whileTap={{ scale: running ? 1 : 0.98 }}>
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" fill="transparent" r="90" stroke="rgba(255,255,255,.1)" strokeWidth="2" />
        <motion.circle animate={{ strokeDasharray: ring }} cx="100" cy="100" fill="transparent" r="90" stroke="url(#zapRing)" strokeLinecap="round" strokeWidth="3" />
        <defs>
          <linearGradient id="zapRing" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffd400" />
            <stop offset="55%" stopColor="#00e7ff" />
            <stop offset="100%" stopColor="#0da8ff" />
          </linearGradient>
        </defs>
      </svg>
      <span className="relative z-10 grid place-items-center">
        {running ? <Loader2 className="mb-4 animate-spin text-zap-yellow" size={28} /> : null}
        <span className="text-[32px] font-semibold uppercase tracking-[0.06em] text-white">{running ? formatMetric(value) : phase === "done" ? "Repetir" : "Iniciar"}</span>
        {running ? <span className="mt-2 text-sm text-white/48">Mbps</span> : null}
      </span>
    </motion.button>
  );
}

function IdentityRow({ result, server }: { result: SpeedtestUpdate; server: LibreSpeedServer }) {
  return (
    <div className="identity-row">
      <div className="text-right"><div className="text-xl font-medium text-white">{providerFromIp(result.clientIp)}</div><div className="mt-1 text-sm text-white/48">{getIpOnly(result.clientIp)}</div></div>
      <span className="identity-icon"><UserRound size={21} /></span>
      <span className="identity-icon"><Globe2 size={21} /></span>
      <div><div className="max-w-[280px] text-xl font-medium text-white">{server.name}</div><div className="mt-1 text-sm text-white/48">{server.sponsorName || "LibreSpeed VPS"}</div></div>
    </div>
  );
}

function ConnectionMode() {
  return <div className="mt-16 text-center"><div className="text-sm text-white/42">Conexoes</div><div className="mt-3 inline-flex items-center gap-4 text-lg"><span className="font-semibold text-white">Multi</span><span className="grid h-10 w-10 place-items-center rounded-full border border-white/18 text-zap-yellow"><Network size={22} /></span><span className="text-white/42">Unica</span></div></div>;
}

function HistoryPanel({ history }: { history: SpeedtestResult[] }) {
  return (
    <section className="history-panel" id="historico">
      <div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-white/46"><History size={17} /> Ultimas medicoes</div>
      <div className="space-y-3">
        {history.length === 0 ? <div className="text-sm text-white/46">O historico sera salvo neste dispositivo.</div> : history.slice(0, 6).map((item) => (
          <div className="history-row" key={item.id}>
            <div><div className="font-medium text-white">{formatMetric(item.dlStatus)} Mbps</div><div className="text-xs text-white/42">{item.time} - {item.server}</div></div>
            <div className="text-right text-sm text-white/58"><div>{formatMetric(item.ulStatus)} up</div><div>{formatMetric(item.pingStatus, 0)} ms</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultsPanel({ result, history, chart, share, download }: { result: SpeedtestResult | null; history: SpeedtestResult[]; chart: number[]; share: () => Promise<void>; download: () => void }) {
  if (!result) {
    return <div className="results-empty"><Zap className="text-zap-yellow" size={28} /><div><div className="font-semibold text-white">Nenhum teste finalizado ainda</div><div className="text-sm text-white/46">Inicie uma medicao para ver download, upload, ping e jitter.</div></div></div>;
  }

  return (
    <section className="results-grid" id="dados">
      <MetricCard label="Download" type="download" unit="Mbps" value={formatMetric(result.dlStatus)} />
      <MetricCard label="Upload" type="upload" unit="Mbps" value={formatMetric(result.ulStatus)} />
      <MetricCard label="Ping" type="ping" unit="ms" value={formatMetric(result.pingStatus, 0)} />
      <MetricCard label="Jitter" type="jitter" unit="ms" value={formatMetric(result.jitterStatus, 0)} />
      <div className="chart-panel">
        <div className="flex items-center justify-between">
          <div><div className="text-sm font-bold uppercase tracking-[0.18em] text-white/46">Estabilidade</div><div className="mt-1 text-white">Ultima medicao</div></div>
          <div className="flex gap-2"><button className="action-button" onClick={share} type="button"><Share2 size={17} /> Compartilhar</button><button className="action-button" onClick={download} type="button"><Download size={17} /> PDF</button></div>
        </div>
        <div className="mt-5 h-36"><Sparkline points={chart} /></div>
      </div>
      <HistoryPanel history={history} />
    </section>
  );
}

function SettingsPanel({ servers, selectedId, setSelectedId }: { servers: LibreSpeedServer[]; selectedId: string; setSelectedId: (id: string) => void }) {
  return (
    <section className="settings-panel">
      <div><div className="text-sm font-bold uppercase tracking-[0.18em] text-white/46">Servidor</div><div className="mt-2 text-lg text-white">Escolha a VPS LibreSpeed para o teste real</div></div>
      <select aria-label="Selecionar servidor LibreSpeed" className="server-select" onChange={(event) => setSelectedId(event.target.value)} value={selectedId}>
        {servers.map((server) => <option key={server.id || server.name} value={String(server.id || server.name)}>{server.name}</option>)}
      </select>
    </section>
  );
}

function readHistory() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as SpeedtestResult[]; } catch { return []; }
}

export function ZapSpeedApp() {
  const [scriptReady, setScriptReady] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>("results");
  const [servers, setServers] = useState<LibreSpeedServer[]>([zapInfoServer]);
  const [selectedId, setSelectedId] = useState(String(zapInfoServer.id || zapInfoServer.name));
  const [result, setResult] = useState<SpeedtestUpdate>(emptyUpdate);
  const [finalResult, setFinalResult] = useState<SpeedtestResult | null>(null);
  const [history, setHistory] = useState<SpeedtestResult[]>([]);
  const [chart, setChart] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<TestPhase>("idle");
  const [status, setStatus] = useState("Pronto para iniciar");
  const testRef = useRef<SpeedtestInstance | null>(null);

  const server = servers.find((item) => String(item.id || item.name) === selectedId) || servers[0];
  const liveValue = phase === "upload" ? toNumber(result.ulStatus) : toNumber(result.dlStatus);

  useEffect(() => { setHistory(readHistory()); }, []);

  useEffect(() => {
    const configured = process.env.NEXT_PUBLIC_LIBRESPEED_SERVERS;
    if (configured) {
      try {
        const parsed = JSON.parse(configured) as LibreSpeedServer[];
        const nextServers = [zapInfoServer, ...parsed];
        setServers(nextServers);
        setSelectedId(String(nextServers[0].id || nextServers[0].name));
        return;
      } catch { setStatus("Lista externa invalida; usando servidor padrao"); }
    }
    fetch("/librespeed/server-list.json")
      .then((response) => response.json())
      .then((list: LibreSpeedServer[]) => {
        const nextServers = [zapInfoServer, ...list.slice(0, 8)];
        setServers(nextServers);
        setSelectedId(String(nextServers[0].id || nextServers[0].name));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10))); }, [history]);

  const finish = useCallback((data: Partial<SpeedtestUpdate>) => {
    const normalized = normalizeResult(data, server);
    setFinalResult(normalized);
    setHistory((items) => [normalized, ...items].slice(0, 10));
    setResult({ ...emptyUpdate, ...data, testState: 4 });
    setPhase("done");
    setStatus("Teste concluido");
    setRunning(false);
    setActivePanel("results");
  }, [server]);

  const startTest = useCallback(() => {
    if (running) return;
    if (!scriptReady || !window.Speedtest) {
      setPhase("error");
      setStatus("LibreSpeed ainda esta carregando");
      return;
    }

    setRunning(true);
    setPhase("download");
    setStatus("Encontrando servidor ideal...");
    setFinalResult(null);
    setChart([]);
    setResult(emptyUpdate);

    try {
      const speed = new window.Speedtest();
      testRef.current = speed;
      let last = emptyUpdate;
      speed.setSelectedServer(server);
      speed.setParameter("telemetry_level", "off");
      speed.setParameter("test_order", "D_U_P");
      speed.setParameter("time_dl_max", 12);
      speed.setParameter("time_ul_max", 12);
      speed.setParameter("time_auto", false);
      speed.onupdate = (data) => {
        last = data;
        const nextPhase = phaseFromState(data.testState);
        setPhase(nextPhase);
        setStatus(phaseLabel(nextPhase));
        setResult(data);
        const point = nextPhase === "upload" ? toNumber(data.ulStatus) : toNumber(data.dlStatus);
        setChart((points) => [...points.slice(-48), point]);
      };
      speed.onend = (aborted) => {
        if (aborted) {
          setPhase("idle");
          setStatus("Teste interrompido");
          setRunning(false);
          return;
        }
        finish(last);
      };
      speed.start();
    } catch {
      setPhase("error");
      setStatus("Nao foi possivel iniciar o teste neste servidor");
      setRunning(false);
    }
  }, [finish, running, scriptReady, server]);

  const share = useCallback(async () => {
    if (!finalResult) return;
    const text = `ZapSpeed: ${formatMetric(finalResult.dlStatus)} Mbps download, ${formatMetric(finalResult.ulStatus)} Mbps upload, ping ${formatMetric(finalResult.pingStatus, 0)} ms.`;
    if (navigator.share) {
      await navigator.share({ title: "Resultado ZapSpeed", text }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(text);
  }, [finalResult]);

  const downloadPdf = useCallback(() => {
    if (!finalResult) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFillColor(13, 14, 30);
    doc.rect(0, 0, 595, 842, "F");
    doc.setTextColor(255, 212, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.text("ZAPSPEED", 48, 70);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Resultado do teste de velocidade", 48, 106);
    doc.setFontSize(44);
    doc.text(`${formatMetric(finalResult.dlStatus)} Mbps`, 48, 186);
    doc.setFontSize(14);
    doc.text("Download", 50, 212);
    [["Upload", `${formatMetric(finalResult.ulStatus)} Mbps`], ["Ping", `${formatMetric(finalResult.pingStatus, 0)} ms`], ["Jitter", `${formatMetric(finalResult.jitterStatus, 0)} ms`], ["Servidor", finalResult.server]].forEach(([label, value], index) => {
      const y = 282 + index * 46;
      doc.setTextColor(255, 212, 0);
      doc.text(label, 50, y);
      doc.setTextColor(255, 255, 255);
      doc.text(value, 210, y);
    });
    doc.save("zapspeed-resultado.pdf");
  }, [finalResult]);

  return (
    <>
      <Script onLoad={() => setScriptReady(true)} src="/speedtest.js" strategy="afterInteractive" />
      <main className="speed-shell">
        <Header />
        <section className="speed-hero">
          <ControlTabs active={activePanel} setActive={setActivePanel} />
          <div className="mt-16 flex flex-col items-center">
            <StartButton onClick={startTest} phase={phase} running={running} value={liveValue} />
            <motion.div animate={{ opacity: 1, y: 0 }} className="mt-9 text-center" initial={{ opacity: 0, y: 10 }}>
              <div className="text-xl font-medium text-white">{status}</div>
              <div className="mt-2 text-sm text-white/42">{phaseLabel(phase)}</div>
            </motion.div>
            <IdentityRow result={result} server={server} />
            <ConnectionMode />
          </div>
        </section>
        <AnimatePresence mode="wait">
          {activePanel === "settings" ? (
            <motion.div animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} initial={{ opacity: 0, y: 18 }} key="settings">
              <SettingsPanel selectedId={selectedId} servers={servers} setSelectedId={setSelectedId} />
            </motion.div>
          ) : (
            <motion.div animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} initial={{ opacity: 0, y: 18 }} key="results">
              <ResultsPanel chart={chart} download={downloadPdf} history={history} result={finalResult} share={share} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}

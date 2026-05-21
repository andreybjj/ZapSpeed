"use client";

import Script from "next/script";
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Check,
  Download,
  FileText,
  Gauge,
  Globe2,
  History,
  Menu,
  Moon,
  MoreHorizontal,
  RadioTower,
  Rocket,
  Share2,
  Signal,
  Smartphone,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  emptyUpdate,
  formatMetric,
  LibreSpeedServer,
  normalizeResult,
  SpeedtestInstance,
  SpeedtestResult,
  SpeedtestUpdate,
  toNumber,
  zapInfoServer,
} from "@/lib/librespeed";

type View = "home" | "result" | "history" | "coverage" | "more";
type Platform = "android" | "ios";

const HOME_HIGHLIGHTS = [
  [Gauge, "Velocimetro", "em tempo real"],
  [Activity, "Resultados", "completos"],
  [History, "Historico", "de testes"],
  [Globe2, "Servidor", "otimizado"],
  [Share2, "Compartilhar", "resultado"],
  [Moon, "Modo escuro", "premium"],
] as const;

const RESULT_HIGHLIGHTS = [
  [Smartphone, "Design", "moderno"],
  [Zap, "Animacoes", "suaves"],
  [Activity, "Graficos", "em tempo real"],
  [Share2, "Compartilhar", "facil"],
  [FileText, "PDF", "do resultado"],
  [Signal, "100%", "Responsivo"],
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function speedAngle(speed: number) {
  const amount = 1 - 1 / Math.pow(1.32, Math.sqrt(Math.max(0, speed)));
  return -132 + clamp(amount, 0, 1) * 264;
}

function StatusBar({ platform }: { platform: Platform }) {
  return (
    <div className="relative z-10 flex h-12 items-center justify-between px-6 pt-2 text-[15px] font-bold">
      <span>14:32</span>
      {platform === "ios" ? (
        <div className="dynamic-island absolute left-1/2 top-3 flex -translate-x-1/2 items-center justify-end pr-7">
          <span className="camera-dot" />
        </div>
      ) : (
        <span className="android-dot absolute left-1/2 top-4 -translate-x-1/2" />
      )}
      <div className="flex items-center gap-1 text-white">
        <Signal size={16} strokeWidth={3} />
        <Wifi size={16} fill="white" strokeWidth={3} />
        <span className="text-xs">100%</span>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-zap-yellow text-black shadow-[0_0_34px_rgba(255,212,0,.42)]">
        <Wifi size={25} strokeWidth={3.2} />
      </div>
      <div className="leading-none">
        <div className="text-[24px] font-black tracking-wide">
          ZAP<span className="text-zap-yellow">INFO</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.34em] text-white/80">
          Conectividade
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full text-zap-yellow transition hover:bg-white/10"
      type="button"
    >
      {children}
    </button>
  );
}

function PhoneHeader({
  view,
  setView,
  platform,
}: {
  view: View;
  setView: (view: View) => void;
  platform: Platform;
}) {
  return (
    <>
      <StatusBar platform={platform} />
      <div className="relative z-10 flex items-center justify-between px-6 pt-3">
        {view === "home" ? (
          <IconButton label="Menu">
            <Menu size={27} />
          </IconButton>
        ) : (
          <IconButton label="Voltar" onClick={() => setView("home")}>
            <ArrowLeft size={26} />
          </IconButton>
        )}
        <Brand />
        {view === "home" ? (
          <IconButton label="Notificacoes">
            <Bell size={24} />
          </IconButton>
        ) : (
          <IconButton label="Compartilhar">
            <Share2 size={24} />
          </IconButton>
        )}
      </div>
    </>
  );
}

function GaugeMeter({ value, state }: { value: number; state: number }) {
  const angle = speedAngle(value);
  const ticks = useMemo(() => Array.from({ length: 29 }, (_, i) => -132 + i * (264 / 28)), []);
  const progress = clamp(value / 900, 0, 1);

  return (
    <div className="meter mt-5">
      <svg viewBox="0 0 340 260" aria-hidden="true">
        <defs>
          <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffd400" />
            <stop offset="65%" stopColor="#ffe45c" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity=".48" />
          </linearGradient>
          <filter id="meterGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d="M 38 218 A 142 142 0 0 1 302 218" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="11" />
        <path
          d="M 38 218 A 142 142 0 0 1 302 218"
          fill="none"
          filter="url(#meterGlow)"
          stroke="url(#meterGradient)"
          strokeDasharray={`${progress * 420} 420`}
          strokeLinecap="round"
          strokeWidth="11"
        />
        {ticks.map((tick, index) => {
          const long = index % 7 === 0;
          const r1 = long ? 122 : 132;
          const r2 = 140;
          const rad = (tick * Math.PI) / 180;
          return (
            <line
              key={tick}
              x1={170 + Math.cos(rad) * r1}
              y1={218 + Math.sin(rad) * r1}
              x2={170 + Math.cos(rad) * r2}
              y2={218 + Math.sin(rad) * r2}
              stroke={long ? "white" : "rgba(255,255,255,.7)"}
              strokeLinecap="round"
              strokeWidth={long ? 3 : 1.6}
            />
          );
        })}
        {[0, 25, 50, 75, 100].map((label, index) => {
          const tick = -128 + index * 64;
          const rad = (tick * Math.PI) / 180;
          return (
            <text
              key={label}
              fill="white"
              fontSize="16"
              fontWeight="700"
              textAnchor="middle"
              x={170 + Math.cos(rad) * 103}
              y={218 + Math.sin(rad) * 103 + 6}
            >
              {label}
            </text>
          );
        })}
      </svg>
      <motion.div
        animate={{ rotate: angle }}
        className="meter-needle"
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
      />
      <span className="meter-hub" />
      <div className="absolute inset-x-0 bottom-8 text-center">
        <Wifi className="mx-auto mb-5 h-11 w-11 text-zap-yellow drop-shadow-[0_0_14px_rgba(255,212,0,.9)]" fill="currentColor" />
        <motion.div
          animate={{ opacity: 1 }}
          className="text-[44px] font-medium leading-none"
          initial={{ opacity: 0.72 }}
          key={formatMetric(value)}
        >
          {formatMetric(value)}
        </motion.div>
        <div className="mt-1 text-[17px] text-white/85">Mbps</div>
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-white/78">
          <span className="grid h-4 w-4 place-items-center rounded-full border border-zap-yellow text-zap-yellow">
            <ArrowDown size={10} />
          </span>
          {state === 3 ? "Upload" : "Download"}
        </div>
      </div>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const path = useMemo(() => {
    const data = points.length ? points : [50, 56, 48, 61, 54, 72, 68, 58];
    const max = Math.max(...data, 100);
    const min = Math.min(...data, 0);
    return data
      .map((point, index) => {
        const x = (index / Math.max(1, data.length - 1)) * 100;
        const y = 86 - ((point - min) / Math.max(1, max - min)) * 64;
        return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 92">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffd400" stopOpacity=".24" />
          <stop offset="1" stopColor="#ffd400" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L 100 92 L 0 92 Z`} fill="url(#chartFill)" />
      <path className="chart-line" d={path} fill="none" stroke="#ffd400" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ServerCard({
  server,
  servers,
  selectedId,
  setSelectedId,
}: {
  server: LibreSpeedServer;
  servers: LibreSpeedServer[];
  selectedId: string;
  setSelectedId: (id: string) => void;
}) {
  return (
    <div className="glass-panel mt-4 rounded-2xl p-5 shadow-[0_24px_80px_rgba(0,0,0,.58)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full border border-zap-yellow text-zap-yellow">
            <Globe2 size={18} />
          </div>
          <div className="text-[15px] font-semibold">Servidor selecionado</div>
        </div>
        <select
          aria-label="Alterar servidor"
          className="max-w-[118px] bg-transparent text-right text-[11px] font-black uppercase tracking-wider text-zap-yellow outline-none"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selectedId}
        >
          {servers.map((item) => (
            <option className="bg-black text-white" key={item.id || item.name} value={String(item.id || item.name)}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-5 text-[17px] font-semibold">{server.name}</div>
      <div className="mt-2 text-sm text-white/72">{server.sponsorName || "LibreSpeed VPS"}</div>
      <div className="mt-3 flex items-center gap-2 text-sm text-white/75">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />
        Conectado
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="metric-cell p-5">
      <div className="mb-3 flex items-center gap-3 text-xs font-black uppercase tracking-widest">
        <span className="grid h-6 w-6 place-items-center rounded-full border border-zap-yellow text-zap-yellow">
          <Icon size={15} />
        </span>
        {label}
      </div>
      <div className="text-[28px] font-light leading-none">{value}</div>
      <div className="mt-1 text-[15px] text-white/75">{unit}</div>
    </div>
  );
}

function BottomNav({ active, setView }: { active: View; setView: (view: View) => void }) {
  const items = [
    ["home", Gauge, "Teste"],
    ["history", History, "Historico"],
    ["coverage", RadioTower, "Cobertura"],
    ["more", MoreHorizontal, "Mais"],
  ] as const;

  return (
    <div className="bottom-nav pointer-events-none absolute inset-x-0 bottom-0 z-20 px-7 pb-5 pt-6">
      <div className="pointer-events-auto grid grid-cols-4 gap-1">
        {items.map(([id, Icon, label]) => (
          <button
            className={`grid justify-items-center gap-1 text-[11px] ${active === id ? "text-zap-yellow" : "text-white/74"}`}
            key={id}
            onClick={() => setView(id)}
            type="button"
          >
            <Icon size={24} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="mx-auto mt-5 h-1 w-32 rounded-full bg-white/90" />
    </div>
  );
}

function HomeView({
  result,
  running,
  startTest,
  server,
  servers,
  selectedId,
  setSelectedId,
  statusMessage,
}: {
  result: SpeedtestUpdate;
  running: boolean;
  startTest: () => void;
  server: LibreSpeedServer;
  servers: LibreSpeedServer[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  statusMessage: string;
}) {
  return (
    <motion.main
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 px-7 pb-32 pt-5"
      exit={{ opacity: 0, y: -18 }}
      initial={{ opacity: 0, y: 18 }}
    >
      <div className="mx-auto inline-flex w-full justify-center">
        <div className="rounded-full border border-zap-yellow/70 px-5 py-2 text-[12px] font-black uppercase tracking-widest text-zap-yellow">
          <Rocket className="mr-2 inline" size={15} /> 19 anos de conectividade
        </div>
      </div>
      <section className="pt-6 text-center">
        <h1 className="text-[36px] font-black leading-[1.13]">
          Teste sua
          <br />
          <span className="text-zap-yellow">conexao agora</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[310px] text-[17px] leading-7 text-white/76">
          Internet de alta performance para sua casa ou empresa.
        </p>
      </section>
      <GaugeMeter state={Number(result.testState)} value={toNumber(result.dlStatus)} />
      <motion.button
        className="zap-button mt-3 flex h-14 w-full items-center justify-center gap-8 rounded-3xl text-[15px] font-black uppercase tracking-[0.22em]"
        disabled={running}
        onClick={startTest}
        type="button"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
      >
        {running ? "Testando..." : "Iniciar teste"} <ArrowRight size={25} />
      </motion.button>
      <div className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
        {statusMessage}
      </div>
      <ServerCard server={server} servers={servers} selectedId={selectedId} setSelectedId={setSelectedId} />
    </motion.main>
  );
}

function ResultView({
  result,
  history,
  shareResult,
  downloadPdf,
  chart,
}: {
  result: SpeedtestResult;
  history: SpeedtestResult[];
  shareResult: () => Promise<void>;
  downloadPdf: () => void;
  chart: number[];
}) {
  return (
    <motion.main
      animate={{ opacity: 1, x: 0 }}
      className="relative z-10 px-5 pb-36 pt-5"
      exit={{ opacity: 0, x: -28 }}
      initial={{ opacity: 0, x: 28 }}
    >
      <h2 className="text-center text-[19px] font-bold">Resultado do Teste</h2>
      <div className="glass-panel mt-4 rounded-2xl p-6 text-center">
        <motion.div
          animate={{ scale: 1, rotate: 0 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-zap-yellow text-zap-yellow shadow-[0_0_34px_rgba(255,212,0,.42)]"
          initial={{ scale: 0.55, rotate: -20 }}
        >
          <Check size={48} strokeWidth={2.5} />
        </motion.div>
        <div className="mt-5 text-[15px]">Teste concluido com sucesso!</div>
        <div className="mt-2 text-sm text-white/75">Hoje, {result.time}</div>
      </div>
      <div className="glass-panel metric-grid mt-3 overflow-hidden rounded-2xl">
        <Metric icon={Wifi} label="Ping" unit="ms" value={formatMetric(result.pingStatus, 0)} />
        <Metric icon={ArrowDown} label="Download" unit="Mbps" value={formatMetric(result.dlStatus)} />
        <Metric icon={ArrowUp} label="Upload" unit="Mbps" value={formatMetric(result.ulStatus)} />
        <Metric icon={Gauge} label="Jitter" unit="ms" value={formatMetric(result.jitterStatus, 0)} />
        <div className="col-span-2 p-5">
          <div className="mb-3 flex items-center gap-3 text-xs font-black uppercase tracking-widest">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-zap-yellow text-zap-yellow">
              <Activity size={15} />
            </span>
            Perda de pacotes
          </div>
          <div className="text-[26px] font-light">{formatMetric(result.packetLoss, 0)} %</div>
        </div>
      </div>
      <div className="glass-panel mt-3 rounded-2xl p-4">
        <div className="mb-1 text-[15px] font-semibold">Estabilidade da Conexao</div>
        <div className="h-24">
          <Sparkline points={chart} />
        </div>
      </div>
      <button
        className="zap-button mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-lg text-[13px] font-black uppercase tracking-[0.18em]"
        onClick={shareResult}
        type="button"
      >
        <Share2 size={19} /> Compartilhar resultado
      </button>
      <button
        className="zap-outline mt-2 flex h-11 w-full items-center justify-center gap-3 rounded-lg text-[13px] font-black uppercase tracking-[0.18em]"
        onClick={downloadPdf}
        type="button"
      >
        <Download size={18} /> Baixar PDF
      </button>
      {history.length > 1 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-white/55">Historico recente</div>
          <div className="scroll-soft flex gap-3 overflow-x-auto pb-2">
            {history.slice(1, 5).map((item) => (
              <div className="glass-panel min-w-[145px] rounded-xl p-3" key={item.id}>
                <div className="text-xs text-white/55">{item.time}</div>
                <div className="mt-2 text-xl font-semibold text-zap-yellow">{formatMetric(item.dlStatus)}</div>
                <div className="text-xs text-white/65">Mbps download</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.main>
  );
}

function UtilityView({
  title,
  subtitle,
  icon: Icon,
  history,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  history: SpeedtestResult[];
}) {
  return (
    <motion.main
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 px-6 pb-36 pt-12"
      exit={{ opacity: 0, y: -18 }}
      initial={{ opacity: 0, y: 18 }}
    >
      <div className="grid place-items-center text-center">
        <div className="grid h-20 w-20 place-items-center rounded-3xl border border-zap-yellow/70 text-zap-yellow shadow-[0_0_34px_rgba(255,212,0,.42)]">
          <Icon size={38} />
        </div>
        <h2 className="mt-6 text-2xl font-black">{title}</h2>
        <p className="mt-3 max-w-[300px] text-white/70">{subtitle}</p>
      </div>
      {history.length > 0 && (
        <div className="mt-8 space-y-3">
          {history.slice(0, 4).map((item) => (
            <div className="glass-panel flex items-center justify-between rounded-2xl p-4" key={item.id}>
              <div>
                <div className="text-sm text-white/60">{item.time}</div>
                <div className="font-semibold">{formatMetric(item.dlStatus)} Mbps</div>
              </div>
              <div className="text-right text-sm text-white/65">
                <div>{formatMetric(item.ulStatus)} up</div>
                <div>{formatMetric(item.pingStatus, 0)} ms</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.main>
  );
}

function SideHighlights({
  items,
  align = "left",
}: {
  items: typeof HOME_HIGHLIGHTS | typeof RESULT_HIGHLIGHTS;
  align?: "left" | "right";
}) {
  return (
    <aside className={`side-card hidden p-7 xl:block ${align === "left" ? "mr-7" : "ml-7"}`}>
      <h3 className="mb-7 text-center text-[15px] font-black uppercase tracking-widest text-zap-yellow">
        Destaques
      </h3>
      <div className="space-y-6">
        {items.map(([Icon, title, text]) => (
          <div className="flex items-center gap-4" key={title}>
            <Icon className="shrink-0 text-zap-yellow" size={30} strokeWidth={2} />
            <div className="text-sm leading-6">
              <div>{title}</div>
              <div>{text}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function PlatformLabel({ platform }: { platform: Platform }) {
  return (
    <div className="mb-3 hidden items-center justify-center gap-2 text-[16px] font-black uppercase tracking-widest text-zap-yellow md:flex">
      <Smartphone size={18} />
      {platform === "android" ? "Android" : "iPhone / iOS"}
    </div>
  );
}

function makeStorageHistory() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("zapinfo-speed-history") || "[]") as SpeedtestResult[];
  } catch {
    return [];
  }
}

export function ZapSpeedApp() {
  const [view, setView] = useState<View>("home");
  const [platform, setPlatform] = useState<Platform>("android");
  const [scriptReady, setScriptReady] = useState(false);
  const [servers, setServers] = useState<LibreSpeedServer[]>([zapInfoServer]);
  const [selectedId, setSelectedId] = useState(String(zapInfoServer.id || zapInfoServer.name));
  const [result, setResult] = useState<SpeedtestUpdate>(emptyUpdate);
  const [finalResult, setFinalResult] = useState<SpeedtestResult | null>(null);
  const [chart, setChart] = useState<number[]>([48, 58, 50, 62, 51, 76, 70, 56, 62, 72, 58]);
  const [history, setHistory] = useState<SpeedtestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Pronto para testar");
  const testRef = useRef<SpeedtestInstance | null>(null);

  const server = servers.find((item) => String(item.id || item.name) === selectedId) || servers[0];

  useEffect(() => {
    setPlatform(/iphone|ipad|ios/i.test(navigator.userAgent) ? "ios" : "android");
    setHistory(makeStorageHistory());
  }, []);

  useEffect(() => {
    const configured = process.env.NEXT_PUBLIC_LIBRESPEED_SERVERS;
    if (configured) {
      try {
        const parsed = JSON.parse(configured) as LibreSpeedServer[];
        const nextServers = [zapInfoServer, ...parsed];
        setServers(nextServers);
        setSelectedId(String(nextServers[0].id || nextServers[0].name));
        return;
      } catch {
        // Invalid public env JSON falls back to bundled server list.
      }
    }

    fetch("/librespeed/server-list.json")
      .then((response) => response.json())
      .then((list: LibreSpeedServer[]) => {
        const nextServers = [zapInfoServer, ...list.slice(0, 12)];
        setServers(nextServers);
        setSelectedId(String(nextServers[0].id || nextServers[0].name));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    localStorage.setItem("zapinfo-speed-history", JSON.stringify(history.slice(0, 12)));
  }, [history]);

  useEffect(
    () => () => {
      try {
        testRef.current?.abort();
      } catch {
        // Ignore abort errors from a completed LibreSpeed worker.
      }
    },
    [],
  );

  const finish = useCallback(
    (data: Partial<SpeedtestUpdate>) => {
      const normalized = normalizeResult(data, server);
      setResult({
        ...emptyUpdate,
        ...data,
        testState: 4,
      });
      setFinalResult(normalized);
      setHistory((items) => [normalized, ...items].slice(0, 12));
      setRunning(false);
      setView("result");
    },
    [server],
  );

  const startTest = useCallback(() => {
    if (running) return;
    setRunning(true);
    setFinalResult(null);
    setResult(emptyUpdate);
    setChart([]);
    setStatusMessage("Conectando ao LibreSpeed...");

    if (!scriptReady || !window.Speedtest) {
      setStatusMessage("Motor LibreSpeed ainda carregando");
      setRunning(false);
      return;
    }

    try {
      const speed = new window.Speedtest();
      testRef.current = speed;
      let last: SpeedtestUpdate = emptyUpdate;

      speed.setSelectedServer(server);
      speed.setParameter("telemetry_level", "off");
      speed.setParameter("test_order", "D_U_P");
      speed.setParameter("time_dl_max", 12);
      speed.setParameter("time_ul_max", 12);
      speed.setParameter("time_auto", false);
      speed.onupdate = (data) => {
        last = data;
        setStatusMessage(
          data.testState === 1
            ? "Medindo download em tempo real"
            : data.testState === 2
              ? "Medindo ping e jitter"
              : data.testState === 3
                ? "Medindo upload em tempo real"
                : "Processando resultado",
        );
        setResult(data);
        const current =
          Number(data.testState) === 3
            ? toNumber(data.ulStatus) / 4
            : toNumber(data.dlStatus) / 8 + toNumber(data.pingStatus);
        setChart((points) => [...points.slice(-34), current || 0]);
      };
      speed.onend = (aborted) => {
        if (aborted) {
          setStatusMessage("Teste interrompido");
          setRunning(false);
          return;
        }
        setStatusMessage("Teste concluido");
        finish(last);
      };
      speed.start();
    } catch {
      setStatusMessage("Nao foi possivel iniciar o LibreSpeed neste servidor");
      setRunning(false);
    }
  }, [finish, running, scriptReady, server]);

  const shareResult = useCallback(async () => {
    const active = finalResult || normalizeResult(result, server);
    const text = `ZapInfo Speedtest: ${formatMetric(active.dlStatus)} Mbps download, ${formatMetric(active.ulStatus)} Mbps upload, ping ${formatMetric(active.pingStatus, 0)} ms.`;
    if (navigator.share) {
      await navigator.share({ title: "Resultado ZapInfo", text }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(text);
  }, [finalResult, result, server]);

  const downloadPdf = useCallback(() => {
    const active = finalResult || normalizeResult(result, server);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFillColor(5, 7, 13);
    doc.rect(0, 0, 595, 842, "F");
    doc.setTextColor(255, 212, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("ZAPINFO", 48, 74);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Resultado do Speedtest", 48, 108);
    doc.setFontSize(44);
    doc.text(`${formatMetric(active.dlStatus)} Mbps`, 48, 190);
    doc.setFontSize(14);
    doc.text("Download", 50, 216);
    [
      ["Upload", `${formatMetric(active.ulStatus)} Mbps`],
      ["Ping", `${formatMetric(active.pingStatus, 0)} ms`],
      ["Jitter", `${formatMetric(active.jitterStatus, 0)} ms`],
      ["Perda de pacotes", `${formatMetric(active.packetLoss, 0)}%`],
      ["Servidor", active.server],
    ].forEach(([label, value], index) => {
      const y = 284 + index * 48;
      doc.setTextColor(255, 212, 0);
      doc.text(label, 50, y);
      doc.setTextColor(255, 255, 255);
      doc.text(value, 220, y);
    });
    doc.setTextColor(160, 160, 160);
    doc.text("Gerado pelo aplicativo ZapInfo Speedtest com LibreSpeed.", 48, 770);
    doc.save("zapinfo-speedtest.pdf");
  }, [finalResult, result, server]);

  const activeResult = finalResult || normalizeResult(result, server);
  const highlights = view === "result" ? RESULT_HIGHLIGHTS : HOME_HIGHLIGHTS;

  return (
    <>
      <Script onLoad={() => setScriptReady(true)} src="/speedtest.js" strategy="afterInteractive" />
      <div className="zap-shell">
        <div className="fixed right-4 top-4 z-30 hidden gap-2 md:flex">
          {(["android", "ios"] as const).map((item) => (
            <button
              className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${platform === item ? "border-zap-yellow bg-zap-yellow text-black" : "border-white/15 bg-white/5 text-white/75"}`}
              key={item}
              onClick={() => setPlatform(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mx-auto flex min-h-screen max-w-[1340px] items-center justify-center py-8">
          <SideHighlights items={highlights} />
          <div>
            <PlatformLabel platform={platform} />
            <div className="phone-frame">
              <div className="phone-screen">
                <PhoneHeader platform={platform} setView={setView} view={view} />
                <AnimatePresence mode="wait">
                  {view === "home" && (
                    <HomeView
                      key="home"
                      result={result}
                      running={running}
                      selectedId={selectedId}
                      server={server}
                      servers={servers}
                      setSelectedId={setSelectedId}
                      startTest={startTest}
                      statusMessage={statusMessage}
                    />
                  )}
                  {view === "result" && (
                    <ResultView
                      chart={chart}
                      downloadPdf={downloadPdf}
                      history={history}
                      key="result"
                      result={activeResult}
                      shareResult={shareResult}
                    />
                  )}
                  {view === "history" && (
                    <UtilityView
                      history={history}
                      icon={History}
                      key="history"
                      subtitle="Todos os testes recentes ficam salvos neste dispositivo."
                      title="Historico"
                    />
                  )}
                  {view === "coverage" && (
                    <UtilityView
                      history={history}
                      icon={RadioTower}
                      key="coverage"
                      subtitle="Servidor LibreSpeed VPS otimizado para medir estabilidade, ping, download e upload."
                      title="Cobertura"
                    />
                  )}
                  {view === "more" && (
                    <UtilityView
                      history={history}
                      icon={MoreHorizontal}
                      key="more"
                      subtitle="Compartilhe resultados, baixe PDF e acompanhe sua conexao."
                      title="Mais"
                    />
                  )}
                </AnimatePresence>
                <BottomNav active={view === "result" ? "home" : view} setView={setView} />
              </div>
            </div>
          </div>
          <SideHighlights align="right" items={highlights} />
        </div>
      </div>
    </>
  );
}

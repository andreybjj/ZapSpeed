export type LibreSpeedServer = {
  id?: string | number;
  name: string;
  displayName?: string;
  city?: string;
  provider?: string;
  server: string;
  dlURL: string;
  ulURL: string;
  pingURL: string;
  getIpURL: string;
  sponsorName?: string;
  sponsorURL?: string;
};

export type SpeedtestUpdate = {
  dlStatus: number | string;
  ulStatus: number | string;
  pingStatus: number | string;
  jitterStatus: number | string;
  dlProgress?: number | string;
  ulProgress?: number | string;
  pingProgress?: number | string;
  testState: number;
  clientIp?: string;
  packetLoss?: number | string;
};

export type SpeedtestResult = {
  id: number;
  time: string;
  server: string;
  dlStatus: number;
  ulStatus: number;
  pingStatus: number;
  jitterStatus: number;
  packetLoss: number;
  clientIp?: string;
};

export type SpeedtestInstance = {
  addTestPoint?(server: LibreSpeedServer): void;
  addTestPoints?(servers: LibreSpeedServer[]): void;
  selectServer?(callback: (server: LibreSpeedServer | null) => void): void;
  setSelectedServer(server: LibreSpeedServer): void;
  setParameter(parameter: string, value: unknown): void;
  start(): void;
  abort(): void;
  onupdate?: (data: SpeedtestUpdate) => void;
  onend?: (aborted: boolean) => void;
};

declare global {
  interface Window {
    Speedtest?: new () => SpeedtestInstance;
  }
}

export const zapInfoServer: LibreSpeedServer = {
  id: "zapinfo-auto",
  name: "ZapInfo - Bonito/MS",
  displayName: "ZAP Info - Bonito/MS",
  city: "Bonito",
  provider: "ZAP Info Fibra",
  server: process.env.NEXT_PUBLIC_LIBRESPEED_SERVER_URL || "https://nyc.speedtest.clouvider.net/backend/",
  dlURL: process.env.NEXT_PUBLIC_LIBRESPEED_DOWNLOAD_PATH || "garbage.php",
  ulURL: process.env.NEXT_PUBLIC_LIBRESPEED_UPLOAD_PATH || "empty.php",
  pingURL: process.env.NEXT_PUBLIC_LIBRESPEED_PING_PATH || "empty.php",
  getIpURL: process.env.NEXT_PUBLIC_LIBRESPEED_IP_PATH || "getIP.php",
  sponsorName: "ZapInfo",
};

export function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatMetric(value: unknown, digits = 2) {
  return toNumber(value).toFixed(digits);
}

export function historyTime(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function normalizeResult(
  data: Partial<SpeedtestUpdate>,
  server: LibreSpeedServer,
): SpeedtestResult {
  return {
    id: Date.now(),
    time: historyTime(),
    server: server.displayName || server.name,
    dlStatus: toNumber(data.dlStatus),
    ulStatus: toNumber(data.ulStatus),
    pingStatus: toNumber(data.pingStatus),
    jitterStatus: toNumber(data.jitterStatus),
    packetLoss: toNumber(data.packetLoss),
    clientIp: data.clientIp,
  };
}

export const emptyUpdate: SpeedtestUpdate = {
  dlStatus: 0,
  ulStatus: 0,
  pingStatus: 0,
  jitterStatus: 0,
  packetLoss: 0,
  dlProgress: 0,
  ulProgress: 0,
  pingProgress: 0,
  testState: -1,
};

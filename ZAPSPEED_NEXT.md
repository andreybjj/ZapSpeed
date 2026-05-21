# ZapSpeed Premium Frontend

Frontend Next.js premium para a ZapInfo, com TailwindCSS, Framer Motion e medicao real via LibreSpeed.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Build

```bash
npm run build
npm run start
```

## LibreSpeed VPS

Configure no Vercel ou em `.env.local`:

```bash
NEXT_PUBLIC_LIBRESPEED_SERVER_URL=https://speedtest.zapinfo.com.br/backend/
NEXT_PUBLIC_LIBRESPEED_DOWNLOAD_PATH=garbage.php
NEXT_PUBLIC_LIBRESPEED_UPLOAD_PATH=empty.php
NEXT_PUBLIC_LIBRESPEED_PING_PATH=empty.php
NEXT_PUBLIC_LIBRESPEED_IP_PATH=getIP.php
```

O frontend nao recria o sistema de medicao. Ele carrega `/speedtest.js`, usa o worker `/speedtest_worker.js` do LibreSpeed e recebe os eventos reais de download, upload, ping e jitter.

## Deploy Vercel

1. Importe o repositorio na Vercel.
2. Configure as variaveis `NEXT_PUBLIC_LIBRESPEED_*`.
3. Deploy com framework `Next.js`.

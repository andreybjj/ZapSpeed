# SpeedZap

Frontend premium da ZapInfo para speedtest em tempo real, preparado para deploy direto na Vercel.

## Stack

- Next.js App Router
- TailwindCSS
- Framer Motion
- LibreSpeed como motor real de medicao
- PDF com jsPDF
- Historico local e compartilhamento nativo

## Deploy na Vercel

1. Importe este repositorio na Vercel: `andreybjj/ZapSpeed`.
2. Framework preset: `Next.js`.
3. Configure as variaveis de ambiente abaixo quando tiver sua VPS LibreSpeed definitiva:

```bash
NEXT_PUBLIC_LIBRESPEED_SERVER_URL=https://speedtest.zapinfo.com.br/backend/
NEXT_PUBLIC_LIBRESPEED_DOWNLOAD_PATH=garbage.php
NEXT_PUBLIC_LIBRESPEED_UPLOAD_PATH=empty.php
NEXT_PUBLIC_LIBRESPEED_PING_PATH=empty.php
NEXT_PUBLIC_LIBRESPEED_IP_PATH=getIP.php
```

4. Clique em Deploy.

## LibreSpeed

O frontend nao recria a medicao. Ele usa o worker do LibreSpeed e envia os endpoints reais da VPS para download, upload, ping, jitter e IP.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Observacao

O reposititorio tambem mantem arquivos originais do LibreSpeed para referencia, mas a aplicacao principal da Vercel e o app Next.js em `src/app`.

# ZapSpeed

Frontend profissional de teste de velocidade para a ZapInfo, feito com Next.js, TailwindCSS, Framer Motion e motor real LibreSpeed.

## O que esta pronto

- Interface inspirada no Speedtest moderno, com identidade ZapInfo em dark premium e amarelo neon.
- Teste real de download, upload, ping e jitter via LibreSpeed.
- Historico das ultimas medicoes salvo no navegador.
- Grafico animado em tempo real.
- Compartilhamento do resultado.
- Exportacao do resultado em PDF.
- Layout responsivo, pronto para Vercel.

## Deploy na Vercel

Importe este repositorio na Vercel. O build padrao do Next.js ja esta configurado.

Variaveis opcionais para usar sua propria VPS LibreSpeed:

```env
NEXT_PUBLIC_LIBRESPEED_SERVER_URL=https://speedtest.seudominio.com/backend/
NEXT_PUBLIC_LIBRESPEED_DOWNLOAD_PATH=garbage.php
NEXT_PUBLIC_LIBRESPEED_UPLOAD_PATH=empty.php
NEXT_PUBLIC_LIBRESPEED_PING_PATH=empty.php
NEXT_PUBLIC_LIBRESPEED_IP_PATH=getIP.php
```

Sem essas variaveis, o app usa um servidor publico LibreSpeed como fallback para o teste funcionar imediatamente.

## Desenvolvimento

```bash
npm install
npm run dev
```

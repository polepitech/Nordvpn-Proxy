# nord-proxy

Conteneur NordVPN (SOCKS5 `:1080`) + healthcheck Node qui pousse le statut vers Uptime Kuma.

## Prérequis

- Docker + Compose (`docker compose` ou `docker-compose`)
- Token NordVPN ([Nord Account](https://my.nordaccount.com/dashboard/nordvpn) → Get access token)
- Moniteur Kuma de type **Push**

## Setup

```bash
cp .env.example .env
nano .env   # renseigner NORDVPN_TOKEN et KUMA_PUSH_URL
```

Exemple `.env` :

```env
NORDVPN_TOKEN=ton_token
COUNTRY=fr
KUMA_PUSH_URL=https://kuma.kraken-lab.fr/api/push/XXXXXXXX
CHECK_INTERVAL_MS=60000
```

## Lancer

```bash
docker compose up -d --build
# ou si le plugin n'est pas dispo :
docker-compose up -d --build
```

Vérifier :

```bash
docker compose logs -f
curl -s --socks5-hostname 127.0.0.1:1080 https://api.ipify.org && echo
```

## Usage côté apps (ex. Puppeteer sur le même host)

```
--proxy-server=socks5://127.0.0.1:1080
```

## Services

| Service       | Rôle                                      |
|---------------|-------------------------------------------|
| `nord-proxy`  | NordVPN + Dante SOCKS5 + Tinyproxy HTTP   |
| `healthcheck` | Node : test SOCKS → push Kuma up/down     |

Le healthcheck considère le proxy **down** si :
- le SOCKS ne répond pas, ou
- l’IP via SOCKS est égale à l’IP directe (fuite / tunnel mort)

## GitHub

Ne commit **jamais** `.env`. Seul `.env.example` est versionné.

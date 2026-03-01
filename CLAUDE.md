# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# Install dependencies
npm install

# Start backend server (development mode with auto-reload)
npm run dev

# Start static file server (for frontend testing)
npm run serve

# Run tests
npm test

# Build production version
npm run build
```

## Architecture Overview

This repository contains two integrated projects:

### 1. hxfund (黄氏家族寻根平台) - Main Project
- **Frontend**: Pure vanilla JavaScript SPA (HTML5 + CSS3 + ES6, zero framework dependencies)
- **Backend**: Node.js + Express + Redis
- **AI Integration**: Alibaba Cloud Qwen (Qwen3.5-plus via Bailian Coding Plan)
- **Deployment**: GitHub Actions + Docker + Aliyun (ECS + Virtual Host)

### 2. anime-blog - Hexo Blog (separate repo, deployed to /blog/ subdirectory)
- Built with Hexo static site generator
- Deployed to `/htdocs/public/blog/` on Aliyun virtual host

## Project Structure

```
hxfund/
├── public/                 # Frontend source (SPA)
│   ├── css/style.css       # Main styles (new Chinese classical style)
│   ├── js/
│   │   ├── data.js         # Data module (family tree, generation data)
│   │   ├── main.js         # Main logic (page loading, navigation)
│   │   ├── modules.js      # Feature modules (UI rendering)
│   │   ├── script.js       # AI client (Qwen chat)
│   │   └── error-monitor.js
│   └── pwa/                # PWA assets
│
├── server/
│   ├── index.js            # Express server entry point
│   ├── auth.js             # Authentication (JWT + API Key)
│   ├── waline.js           # Waline comment system API
│   ├── session-store.js    # Redis session storage
│   └── config/
│       ├── .env            # Environment variables (sensitive)
│       └── auth.json       # Auth config (sensitive, gitignored)
│
├── tests/                  # Test scripts
│   ├── test-api.js
│   ├── test-auth.js
│   └── test-chat.js
│
├── .github/workflows/      # GitHub Actions
│   ├── deploy-integration.yml   # Main deploy (frontend + blog)
│   ├── deploy-full-stack.yml    # Full stack deployment
│   ├── deploy-backend-ecs.yml   # Backend to ECS
│   └── deploy-frontend-aliyun.yml
│
└── rules/                  # Rules automation engine
    ├── rules.json          # Business rules config
    ├── server.js           # Rules engine server
    └── cli.js              # Rules CLI tool
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start backend server (production) |
| `npm run dev` | Start backend (development, auto-restart) |
| `npm run serve` | Serve static files on port 8080 |
| `npm run build` | Build production bundle (CSS/JS minification) |
| `npm run qwen "question"` | Ask Qwen AI a question |
| `npm run qwen:i` | Interactive Qwen AI mode |
| `npm test` | Run all tests |
| `node tests/test-api.js` | Run API tests only |

## API Endpoints

### Qwen AI API
- `POST /api/chat` - Single turn chat
- `POST /api/conversation` - Multi-turn conversation (with session)
- `GET /api/session/:id` - Get session history
- `DELETE /api/session/:id` - Delete session
- `GET /api/models` - Get available models

### Waline Comment API
- `GET/POST /api/waline/article` - Article stats
- `GET/POST /api/waline/comment` - Comments list/create
- `POST /api/waline/comment/:id/like` - Like comment
- `GET /api/waline/system` - System info
- `GET /api/waline/health` - Health check

## Environment Configuration

Backend requires `server/config/.env`:
```bash
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://hxfund.cn,https://www.hxfund.cn
REDIS_URL=redis://localhost:6379
```

AI API Key is managed by CLI tool at `~/.qwen-code/config.json` (run `node scripts/qwen-code.js --init` to configure).

## Deployment

### GitHub Actions (Recommended)
Push to `main` branch triggers automatic deployment:
1. Frontend → Aliyun virtual host (`/htdocs/`)
2. Blog → Aliyun virtual host (`/htdocs/public/blog/`)

Required secrets:
- `FTP_HOST`, `FTP_USER`, `FTP_PASS`, `FTP_PORT` - Virtual host credentials

### Docker
```bash
docker-compose up -d
docker-compose logs -f api
```

## Testing

```bash
# Run all tests
npm test

# Individual test files
node tests/test-api.js      # API endpoint tests
node tests/test-auth.js     # Authentication tests
node tests/test-chat.js     # AI chat tests
```

## Design Tokens

```css
--primary:    #8B4513   /* Brown (main color) */
--gold:       #C8933A   /* Gold (accent) */
--bg:         #f5f3e8   /* Rice paper white (background) */
--bg-dark:    #2d1a0e   /* Dark wood (footer) */
```

Font: **Noto Serif SC** (思源宋体) for classical Chinese style.

## Important Notes

1. **Sensitive files**: `server/config/auth.json` and `.env` are gitignored - never commit
2. **Frontend is vanilla JS**: No React/Vue/Angular dependencies
3. **Dual license**: MIT (code) + CC BY-NC-SA 4.0 (content)
4. **API domain**: `api.hxfund.cn` points to ECS, frontend at `www.hxfund.cn` on virtual host

## Related Documentation

- `README.md` - Main project overview
- `QWEN.md` - Detailed project context
- `deploy/README.md` - Quick deployment guide
- `docs/API_DEPLOYMENT.md` - API deployment details
- `WALINE_INTEGRATION.md` - Waline comment system integration

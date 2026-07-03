<picture>
  <img alt="ShortLab" src="assets/logo-inverted.png">
</picture>

# ShortLab

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://opensource.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![GitHub stars](https://img.shields.io/github/stars/ElioNeto/shortlab?style=social)](https://github.com/ElioNeto/shortlab)
[![Last Commit](https://img.shields.io/github/last-commit/ElioNeto/shortlab)](https://github.com/ElioNeto/shortlab/commits/main)

**Free & open source AI video platform** with 3 tools in one: **Clip Generator**, **AI Shorts (UGC videos with AI actors)**, and **YouTube Studio**. Self-hosted with Docker. No watermarks, no limits.


---

## 3 Tools in 1 Platform

### 1. Clip Generator
Turn your long-form videos — podcasts, webinars, livestreams, vlogs, interviews — into viral-ready 9:16 shorts for TikTok, Instagram Reels, and YouTube Shorts.

### 2. AI Shorts (UGC Video Creator)
Generate marketing videos with AI actors for **any product or business**. No camera, no studio, no influencer budget. Just describe your product or paste a URL.

- **Two cost modes**: Low Cost (~$0.65/video) and Premium (~$2/video)
- Works for any business: SaaS, restaurants, e-commerce, coaching, local businesses
- AI-generated actors with lip-sync, voiceover, b-roll, and TikTok-style subtitles
- Choose from a shared avatar gallery or upload your own photo
- Publish directly to TikTok, Instagram, and YouTube

### 3. YouTube Studio
Complete free AI YouTube toolkit: thumbnails, titles, descriptions, and direct publishing.

- AI thumbnail generator with face overlay
- 10 viral title suggestions with refinement chat
- Auto-generated descriptions with chapter timestamps
- One-click publish to YouTube

### UGC Video Gallery
All generated videos and avatars are saved to a public gallery with SEO pages for each video.

- Public gallery page with hover-to-play (`/gallery`)
- Individual SEO video pages with og:video meta tags (`/video/{id}`)
- JSON-LD structured data for search engines
- Avatar gallery with prompt history

---

## Key Features

### Clip Generator
- **Viral Moment Detection**: Google Gemini 3.0 Flash analyzes transcripts and scene boundaries to detect 3-15 high-potential moments
- **Smart 9:16 Cropping**: Dual-mode AI reframing — TRACK mode (MediaPipe + YOLOv8 face tracking) and GENERAL mode (blurred background)
- **Auto Subtitles**: faster-whisper with word-level timestamps, styled and burned into clips
- **AI Voice Dubbing**: ElevenLabs integration for 30+ languages with voice cloning
- **Hook Text Overlays**: AI-generated attention-grabbing text overlays
- **AI Video Effects**: Gemini-generated FFmpeg filters for professional effects

### AI Shorts Pipeline
1. **Analyze**: Scrape website URL + web research, or generate from manual description
2. **Script**: AI writes viral scripts (hook - problem - solution - CTA format)
3. **Actor**: Generate AI actors with Flux 2 Pro or select from shared gallery
4. **Voice**: ElevenLabs TTS voiceover (English/Spanish, male/female)
5. **Video**: Talking head generation (Hailuo 2.3 Fast img2video + VEED Lipsync)
6. **B-roll**: AI-generated visuals with Ken Burns effect
7. **Composite**: FFmpeg final assembly with subtitles and hook overlays
8. **Publish**: Direct posting to TikTok, Instagram Reels, YouTube Shorts via Upload-Post

### YouTube Studio
- AI-powered title generation with 10 viral options
- Interactive refinement chat for titles
- AI thumbnail generation with custom face + background
- Auto descriptions with chapter timestamps from Whisper transcript
- Direct YouTube publishing via Upload-Post

### Social Auto-Publishing
- **One-click posting** to TikTok, Instagram Reels, and YouTube Shorts simultaneously
- **Schedule uploads** for any date and time — plan your content calendar and let ShortLab publish automatically
- **Multi-platform distribution** — publish to all your social networks at once from a single interface
- Upload-Post integration with async uploads

### Infrastructure
- S3 cloud backup (private bucket for clips, public bucket for gallery/avatars)
- SEO gallery pages served by FastAPI with JSON-LD structured data
- Shared avatar gallery across all users
- Async job queue with configurable concurrency

---

## Who Is This For?

- **Content creators** — Turn long videos into shorts automatically, publish to all platforms at once
- **Marketing agencies** — Generate UGC videos for clients at scale, no actors or studios needed
- **SaaS founders** — Create product demos and marketing shorts from just a URL
- **E-commerce brands** — Product videos with AI actors for TikTok Shop, Instagram, YouTube
- **Local businesses** — Restaurants, gyms, real estate, coaching — affordable video marketing
- **Developers** — Self-host, customize the pipeline, integrate via API



---

## ShortLab vs Competitors

| Feature                                 |    ShortLab     |  Opus Clip  |    CapCut    |   Vizard    |      Klap      |   Descript    |
| --------------------------------------- | :-------------: | :---------: | :----------: | :---------: | :------------: | :-----------: |
| **Price**                               |    **Free**     |  $15-29/mo  |    $8/mo     |  $15-20/mo  |   $23-63/mo    |   $24-65/mo   |
| **Self-hosted**                         |     **Yes**     |     No      |      No      |     No      |       No       |      No       |
| **Open source**                         |     **Yes**     |     No      |      No      |     No      |       No       |      No       |
| **Watermark**                           |    **Never**    |  Free tier  |     Some     |  Free tier  |   Free tier    |   Free tier   |
| **Upload limits**                       |    **None**     |   10-30GB   | Credit-based | 60min-10hr  | 10-100 vids/mo |  60min-40hr   |
| **AI clip detection**                   |       Yes       |     Yes     |     Yes      |     Yes     |      Yes       |      Yes      |
| **Smart 9:16 reframing**                |       Yes       |     Yes     |     Yes      |     Yes     |      Yes       |      No       |
| **Auto subtitles**                      |       Yes       |     Yes     |     Yes      |     Yes     |      Yes       |      Yes      |
| **Voice dubbing (30+ langs)**           |       Yes       |     No      |   Pro only   |     No      |    Pro only    | Business only |
| **AI UGC actors**                       |     **Yes**     |     No      |      No      |     No      |       No       |      No       |
| **AI video effects**                    |       Yes       |     No      |     Yes      |     No      |       No       |      No       |
| **Hook text overlays**                  |       Yes       |     No      |      No      |     No      |       No       |      No       |
| **YouTube Studio (titles, thumbnails)** |     **Yes**     |     No      |      No      |     No      |       No       |      No       |
| **Social auto-publishing**              |       Yes       |  Pro only   | TikTok only  |  Paid only  |   Paid only    |      No       |
| **Schedule uploads**                    |       Yes       |  Pro only   |      No      |  Paid only  |   Paid only    |      No       |
| **Data privacy**                        | **Your server** | Their cloud | Their cloud  | Their cloud |  Their cloud   |  Their cloud  |

---

## How Much Does It Cost?

ShortLab is free. You only pay for the AI APIs you use — most have free tiers:

| Service | Free Tier | Paid Cost | Used For |
|---|---|---|---|
| **Gemini / OpenRouter** | Free tier with generous limits | ~$0.01 per 10-min video | Viral moment detection, scripts, titles |
| **fal.ai** | Pay-per-use | ~$0.50–1.50 per AI Short | Actor, talking head, b-roll |
| **ElevenLabs** | Free tier available | Pay-per-use | Voiceover, dubbing |
| **Upload-Post** | 10 free uploads/month | Pay-per-use | Social posting |
| **AWS S3** | Optional | ~$0.023/GB | Cloud backup |

**Bottom line:** Clip videos for practically free with Gemini/OpenRouter, and publish up to 10 videos/month to all social networks at zero cost with Upload-Post.

---

## Requirements

- **Docker & Docker Compose**
- **Google Gemini** or **OpenRouter API Key** — required for AI features (viral moment detection, titles, scripts)
- **fal.ai API Key** ([Pay-per-use](https://fal.ai)) — required for AI Shorts only (actor generation, talking head, lip-sync)
- **ElevenLabs API Key** ([Free tier](https://elevenlabs.io)) — required for voiceover/dubbing
- **Upload-Post API Key** ([Free tier](https://upload-post.com)) — required for social media publishing

> All API keys are optional depending on which features you use. The app runs without any — only the specific features that require each key will be unavailable.

---

## Getting Started

### 1. Clone
```bash
git clone https://github.com/your-username/ShortLab.git
cd ShortLab
```

### 2. Configure (optional)
```bash
cp .env.example .env
# Edit .env with your AWS keys for S3 backup
```

### 3. Launch
```bash
docker compose up --build
```

### 4. Open Dashboard
Navigate to **`http://localhost:5175`**

1. Go to **Settings** and enter your API keys (Gemini, fal.ai, ElevenLabs, Upload-Post)
2. **Clip Generator**: Upload a long-form video to generate viral shorts
3. **AI Shorts**: Describe your product or paste a URL to generate UGC marketing videos
4. **YouTube Studio**: Generate thumbnails, titles, and descriptions for YouTube
5. **UGC Gallery**: Browse all generated videos and avatars

---

## Technical Pipeline

### Clip Generator
1. **Ingest** — Local video upload (or self-hosted URL ingest via yt-dlp)
2. **Transcribe** — faster-whisper with word-level timestamps
3. **Detect** — PySceneDetect for scene boundaries
4. **Analyze** — Gemini identifies 3-15 viral moments (15-60s each)
5. **Extract** — FFmpeg precise clip cutting
6. **Reframe** — AI vertical cropping with subject tracking
7. **Effects** — Subtitles, hooks, AI video effects
8. **Publish** — S3 backup + Upload-Post social distribution

### AI Shorts
1. **Analyze** — Website scraping + Gemini web research (or manual description)
2. **Script** — Gemini generates viral scripts with segments
3. **Actor** — Flux 2 Pro portrait generation (or gallery/upload)
4. **Voice** — ElevenLabs TTS voiceover
5. **Video** — Hailuo 2.3 Fast img2video + VEED Lipsync (Low Cost) or Kling Avatar v2 (Premium)
6. **B-roll** — Flux 2 Pro image generation + Ken Burns effect
7. **Composite** — FFmpeg assembly with ASS subtitles and hook overlays
8. **Gallery** — Upload to public S3 with metadata for SEO pages
9. **Publish** — Upload-Post to TikTok, Instagram, YouTube

---

## Tech Stack

| Layer          | Technology                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Backend        | Python 3.11, FastAPI, google-genai, faster-whisper, ultralytics (YOLOv8), mediapipe, opencv-python, yt-dlp, FFmpeg, httpx |
| Frontend       | React 18, Vite 4, Tailwind CSS 3.4                                                                                        |
| AI APIs        | Google Gemini, fal.ai (Flux, Hailuo, VEED, Kling), ElevenLabs                                                             |
| Infrastructure | Docker + Docker Compose, AWS S3                                                                                           |
| Publishing     | Upload-Post API (TikTok, Instagram, YouTube)                                                                              |

---

## Environment Variables

**Server-side (.env):**
| Variable | Description |
|---|---|
| `LLM_PROVIDER` | LLM provider: `gemini` or `openrouter` (default: `openrouter`) |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_BASE_URL` | OpenRouter base URL (default: https://openrouter.ai/api/v1) |
| `OPENROUTER_MODEL` | OpenRouter model (default: google/gemini-2.0-flash-001) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `AWS_ACCESS_KEY_ID` | AWS access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region (default: us-east-1) |
| `AWS_S3_BUCKET` | Private bucket for clip backup |
| `AWS_S3_PUBLIC_BUCKET` | Public bucket for gallery/avatars |
| `MAX_CONCURRENT_JOBS` | Concurrent processing limit (default: 5) |
| `YOUTUBE_COOKIES` | Netscape-format cookies to bypass YouTube bot detection |

**Client-side (stored in localStorage):**
| Key | Description |
|---|---|
| `gemini_key` | LLM API key (Gemini or OpenRouter) |
| `llm_provider` | Provider name: `gemini` or `openrouter` |
| `llm_model` | Custom model override (optional) |
| `fal_key` | fal.ai — for AI Shorts |
| `elevenlabs_key` | ElevenLabs — for voiceover/dubbing |
| `upload_post_key` | Upload-Post — for social posting |

---

## Security

- **Non-Root Execution**: Containers run as dedicated `appuser`
- **Path Traversal Protection**: All uploaded filenames sanitized with `os.path.basename()` + regex stripping
- **FFmpeg Filter Sanitization**: AI-generated filter strings validated — dangerous patterns (`movie=`, backticks, pipes) blocked
- **Content Ownership Acknowledgment**: Upload attestation logged with IP, user agent, and timestamp
- **File Size Limits**: 2GB maximum per upload
- **Image Format Validation**: Content-type check on actor image uploads (minimum 1KB)
- **Webhook HMAC Signing**: Optional SHA-256 signatures for outbound webhooks
- **CORS**: Restricted to origins defined in `ALLOWED_ORIGINS` env var
- **Production Network Isolation**: Backend/renderer services on internal network, only frontend exposed externally
- **Memory/CPU Limits**: Resource limits configured in production docker-compose
- **API Key Auth**: Optional middleware (`API_AUTH_KEY` env var) protects `/api/` routes
- **Secrets in .dockerignore**: `.env` files excluded from Docker build context

> API keys are stored client-side in localStorage with base64 obfuscation — not encryption. Do not store sensitive keys. In production, deploy behind TLS.

---

## Social Media Setup (Upload-Post)

1. **Register**: [app.upload-post.com/login](https://app.upload-post.com/login)
2. **Create Profile**: Go to [Manage Users](https://app.upload-post.com/manage-users)
3. **Connect Accounts**: Link TikTok, Instagram, and/or YouTube
4. **Get API Key**: Navigate to [API Keys](https://app.upload-post.com/api-keys)
5. **Use in ShortLab**: Paste the key in Settings

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ElioNeto/shortlab&type=Date)](https://star-history.com/#ElioNeto/shortlab&Date)

## Contributions

Contributions are welcome! Whether it's adding new AI models, improving the lip-sync pipeline, or building new features — feel free to open a PR.

## License

MIT License. ShortLab is yours to use, modify, and scale.

# CLAUDE.md

## Project Overview

ShortLab is an AI-powered vertical video generator that transforms long YouTube videos or local uploads into viral-ready short clips (9:16 format) for TikTok, Instagram Reels, and YouTube Shorts. Uses Google Gemini for viral moment detection and title generation.

## TeamCode Commands

| Command | Description |
|---------|-------------|
| `@teamcode dev` | Start all services (Docker) |
| `@teamcode dev:backend` | Backend API only |
| `@teamcode dev:frontend` | Frontend dev server only |
| `@teamcode test` | Run all tests |
| `@teamcode test:backend` | Backend tests only |
| `@teamcode test:e2e` | E2E Playwright tests |
| `@teamcode lint` | Python lint (ruff) |
| `@teamcode lint:frontend` | Frontend lint (eslint) |
| `@teamcode ci` | Full CI pipeline |
| `@teamcode docker:prod` | Production Docker stack |
| `@teamcode docs` | OpenAPI docs |

## Architecture

### Router Structure (app.py is now 119 lines - down from 2392)
- `routers/processing.py` - Video processing, status, queue
- `routers/editing.py` - Subtitles, hooks, effects, translation
- `routers/social.py` - Social media posting
- `routers/thumbnail.py` - AI thumbnail/title generation
- `routers/saasshorts.py` - AI UGC video generation
- `routers/gallery.py` - Public video gallery
- `routers/manual_editor.py` - Manual trim, concat, PiP, split screen
- `routers/auth.py` - JWT authentication
- `routers/webhooks.py` - Webhook notifications
- `routers/batch.py` - Batch processing (1-10 files)
- `routers/preview.py` - Video clip preview (30s max)
- `routers/templates.py` - Video style templates
- `routers/analytics.py` - Processing metrics
- `routers/plugins.py` - Plugin system architecture
- `routers/abtesting.py` - Thumbnail/title A/B testing
- `routers/queue.py` - Redis/in-memory job queue
- `routers/state.py` - Shared application state

### Frontend Components
- `dashboard/src/App.jsx` - Main app with sidebar + routing
- `dashboard/src/components/VideoEditor.jsx` - Manual trim, PiP, split screen
- `dashboard/src/components/saashorts/` - 6 sub-components for AI Shorts
- `dashboard/src/components/thumbnail/` - 5 sub-components for thumbnail studio
- `dashboard/src/ThemeContext.jsx` - Dark/light theme
- `dashboard/src/i18n.js` - Multi-language (en, pt, es)

### Key Backend Modules
- `editor.py` - AI video effects via FFmpeg
- `hooks.py` - Text overlay generation
- `subtitles.py` - SRT generation + FFmpeg subtitle burning
- `translate.py` - ElevenLabs dubbing API
- `s3_uploader.py` - AWS S3 with parallel batch operations

## Conventions
- New features go in `routers/` module, not app.py
- Use `app_logger.logger` instead of print()
- FFmpeg filter strings must pass through `_sanitize_filter_string()`
- Font names must pass regex validation before subtitle FFmpeg commands
- Uploaded filenames must use `os.path.basename()` to prevent path traversal

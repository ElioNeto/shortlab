# Changelog

## [Unreleased]

### Changed
- Security section updated to reflect actual implementations (path traversal protection, FFmpeg sanitization, audit logging, network isolation)
- Requirements section clarified — all API keys optional, OpenRouter support added
- Environment variables updated with actual keys used by the app

## [2026-07-03]

### Fixed
- CI pipeline: ESLint config converted from v9 flat config to v8 legacy format
- CI pipeline: Missing `batch_router` and `preview_router` imports in `app.py`
- CI pipeline: Unnecessary `global` declarations removed from `s3_uploader.py`
- CI pipeline: Dead code removed from `saasshorts.py`
- Docker build: Missing closing `)` for `React.memo()` in `ResultCard.jsx`
- Docker build: Escaped `>` characters in JSX text (`ProcessingAnimation.jsx`)
- Docker build: Tailwind CSS opacity modifiers with CSS variable colors

### Added
- Manual video editor (trim, concat, PiP, split screen)
- E2E Playwright tests
- Production docker-compose with resource limits and network isolation
- GOD agent with unrestricted permissions in teamcode config

### Changed
- Project renamed from OpenShorts to ShortLab
- Large components refactored into smaller modules
- Thread-safe cache added to `s3_uploader.py`
- Security fixes and infrastructure improvements

FROM node:18-bookworm-slim

# Install Chromium and FFmpeg for Remotion rendering
RUN apt-get update && \
    apt-get install -y --no-install-recommends chromium ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /bin/sh appuser

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV REMOTION_BUNDLE_PATH=/app/remotion
ENV OUTPUT_DIR=/output

WORKDIR /app

# Copy render service source
COPY render-service/package.json ./
RUN npm install

COPY render-service/tsconfig.json ./
COPY render-service/src/ ./src/

# Copy remotion source for bundling
COPY remotion/package.json /app/remotion/package.json
COPY remotion/tsconfig.json /app/remotion/tsconfig.json
COPY remotion/src/ /app/remotion/src/
COPY remotion/public/ /app/remotion/public/

# Install remotion deps
RUN cd /app/remotion && npm install

# Build TypeScript
RUN npm run build

# Create output directory and set permissions
RUN mkdir -p /output && chown -R appuser:appuser /output && chown appuser:appuser /app

EXPOSE 3100

USER appuser

CMD ["node", "dist/server.js"]

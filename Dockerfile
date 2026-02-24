FROM node:24.13-alpine

RUN apk add --no-cache \
      bash \
      less \
      zip \
      ttf-freefont \
      ttf-opensans \
      ttf-inconsolata \
      ttf-liberation \
      ttf-dejavu \
      chromium \
      nss \
      freetype \
      freetype-dev \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      dumb-init

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile
# Replace vulnerable packages in global node_modules to satisfy Trivy scans
RUN if [ -d "/usr/src/app/node_modules/tar" ]; then \
      find /usr/local/lib/node_modules -type d -name "tar" -path "*/node_modules/tar" | while read tardir; do \
        echo "Updating tar in: $tardir (CVE-2026-24842)"; \
        rm -rf "$tardir" && cp -r /usr/src/app/node_modules/tar "$tardir"; \
      done; \
    fi

RUN if [ -d "/usr/src/app/node_modules/@isaacs/brace-expansion" ]; then \
      find /usr/local/lib/node_modules -type d -path "*/node_modules/@isaacs/brace-expansion" | while read bracedir; do \
        echo "Updating @isaacs/brace-expansion in: $bracedir (CVE-2026-25547)"; \
        rm -rf "$bracedir" && cp -r /usr/src/app/node_modules/@isaacs/brace-expansion "$bracedir"; \
      done; \
    fi

RUN if [ -d "/usr/src/app/node_modules/minimatch" ]; then \
      find /usr/local/lib/node_modules -type d -name "minimatch" -path "*/node_modules/minimatch" | while read mmdir; do \
        echo "Updating minimatch in: $mmdir (CVE-2026-26996)"; \
        rm -rf "$mmdir" && cp -r /usr/src/app/node_modules/minimatch "$mmdir"; \
      done; \
    fi

COPY . .
COPY ./fonts/ /usr/share/fonts

RUN yarn build

EXPOSE 9000

RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser && \
    chown -R appuser:appgroup /usr/src/app

USER appuser

CMD [ "dumb-init", "node", "dist/index.js" ]

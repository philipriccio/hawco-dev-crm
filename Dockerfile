# syntax=docker/dockerfile:1.7

FROM node:22.23.4-slim AS deps

# Debian bookworm APT CVE-2026-109518: bootstrap from signed-index SHA256s
# before any package downloads. Remote ADD uses HTTPS; dpkg is offline.
ADD --checksum=sha256:796fc7fe18866f5b1fb27a115d7339e549d71b7ddbc15b8d6fc4226c243e96d1 https://deb.debian.org/debian-security/pool/updates/main/a/apt/apt_2.6.2_amd64.deb /tmp/apt-patch/apt.deb
ADD --checksum=sha256:023a7017b75295fc7037c7a4352847f9516a36a82cc5e1650d6832d238860913 https://deb.debian.org/debian-security/pool/updates/main/a/apt/libapt-pkg6.0_2.6.2_amd64.deb /tmp/apt-patch/libapt.deb
RUN test "$(dpkg --print-architecture)" = amd64 \
  && dpkg -i /tmp/apt-patch/libapt.deb /tmp/apt-patch/apt.deb \
  && rm -rf /tmp/apt-patch \
  && sed -i 's,http://,https://,g' /etc/apt/sources.list.d/debian.sources \
  && test "$(dpkg-query -W -f='${Version}' apt)" = 2.6.2
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --no-audit --no-fund

FROM node:22.23.4-slim AS builder

# Debian bookworm APT CVE-2026-109518: bootstrap from signed-index SHA256s
# before any package downloads. Remote ADD uses HTTPS; dpkg is offline.
ADD --checksum=sha256:796fc7fe18866f5b1fb27a115d7339e549d71b7ddbc15b8d6fc4226c243e96d1 https://deb.debian.org/debian-security/pool/updates/main/a/apt/apt_2.6.2_amd64.deb /tmp/apt-patch/apt.deb
ADD --checksum=sha256:023a7017b75295fc7037c7a4352847f9516a36a82cc5e1650d6832d238860913 https://deb.debian.org/debian-security/pool/updates/main/a/apt/libapt-pkg6.0_2.6.2_amd64.deb /tmp/apt-patch/libapt.deb
RUN test "$(dpkg --print-architecture)" = amd64 \
  && dpkg -i /tmp/apt-patch/libapt.deb /tmp/apt-patch/apt.deb \
  && rm -rf /tmp/apt-patch \
  && sed -i 's,http://,https://,g' /etc/apt/sources.list.d/debian.sources \
  && test "$(dpkg-query -W -f='${Version}' apt)" = 2.6.2
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=768
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build --webpack

FROM node:22.23.4-slim AS runner

# Debian bookworm APT CVE-2026-109518: bootstrap from signed-index SHA256s
# before any package downloads. Remote ADD uses HTTPS; dpkg is offline.
ADD --checksum=sha256:796fc7fe18866f5b1fb27a115d7339e549d71b7ddbc15b8d6fc4226c243e96d1 https://deb.debian.org/debian-security/pool/updates/main/a/apt/apt_2.6.2_amd64.deb /tmp/apt-patch/apt.deb
ADD --checksum=sha256:023a7017b75295fc7037c7a4352847f9516a36a82cc5e1650d6832d238860913 https://deb.debian.org/debian-security/pool/updates/main/a/apt/libapt-pkg6.0_2.6.2_amd64.deb /tmp/apt-patch/libapt.deb
RUN test "$(dpkg --print-architecture)" = amd64 \
  && dpkg -i /tmp/apt-patch/libapt.deb /tmp/apt-patch/apt.deb \
  && rm -rf /tmp/apt-patch \
  && sed -i 's,http://,https://,g' /etc/apt/sources.list.d/debian.sources \
  && test "$(dpkg-query -W -f='${Version}' apt)" = 2.6.2
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/private/wgc ./private/wgc
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]

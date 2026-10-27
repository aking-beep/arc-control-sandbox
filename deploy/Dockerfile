# Meridian Validation Lab + ARC Control in one container, for a PRIVATE hosted
# test environment. The operator routes have no authentication of their own:
# never publish this container's ports directly. Use docker-compose.yml, which
# puts an authenticating proxy in front and keeps the ARC API internal.
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Pin ARC to a commit for reproducible runs. The repository's default branch is
# not main, so the ref is always explicit.
ARG ARC_REF=main
WORKDIR /opt
RUN git clone --filter=blob:none https://github.com/aking-beep/arc-control.git arc-control \
 && cd arc-control && git checkout "$ARC_REF" \
 && npm ci --ignore-scripts && npm run build

COPY --chown=node:node . /opt/arc-control-sandbox
WORKDIR /opt/arc-control-sandbox
RUN npm --prefix ui ci && npm --prefix ui run build && chown -R node:node /opt/arc-control-sandbox

USER node
ENV ARC_REPO_PATH=/opt/arc-control \
    SANDBOX_BIND_HOST=0.0.0.0 \
    SANDBOX_ALLOW_REMOTE_BIND=1
EXPOSE 8890 8788
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -fs http://127.0.0.1:8890/api/health || exit 1
CMD ["node", "src/start.mjs"]

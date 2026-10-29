# Meridian Validation Lab + ARC Control in one container, for a PRIVATE hosted
# test environment. The operator routes have no authentication of their own:
# never publish this container's ports directly. Use docker-compose.yml, which
# puts an authenticating proxy in front and keeps the ARC API internal.
FROM node:22-bookworm-slim

# Pin ARC to a commit for reproducible runs. The repository's default branch
# may not be main, so the ref is always explicit. BuildKit fetches it; the
# image needs no git.
ARG ARC_REF=main
ADD https://github.com/aking-beep/arc-control.git#${ARC_REF} /opt/arc-control

# Behind a TLS-inspecting proxy, pass its CA as a build secret:
#   docker build --secret id=extra_ca,src=proxy-ca.pem ...
# It is read only during these steps and is not stored in any layer.
WORKDIR /opt/arc-control
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi \
 && npm ci --ignore-scripts && npm run build

COPY --chown=node:node . /opt/arc-control-sandbox
WORKDIR /opt/arc-control-sandbox
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi \
 && npm ci --omit=dev --ignore-scripts \
 && npm --prefix ui ci && npm --prefix ui run build && chown -R node:node /opt/arc-control-sandbox

# Reports name what was tested; the image has no .git to read it from.
ARG SANDBOX_REF=unknown
USER node
ENV ARC_REVISION=${ARC_REF} \
    SANDBOX_REVISION=${SANDBOX_REF} \
    ARC_REPO_PATH=/opt/arc-control \
    SANDBOX_BIND_HOST=0.0.0.0 \
    SANDBOX_ALLOW_REMOTE_BIND=1
EXPOSE 8890 8788
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8890/api/health').then(r => r.json()).then(h => process.exit(h.gatewayConfigured === true ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/start.mjs"]

---
name: deploy-lab
description: Puts the Validation Lab on a server behind a login, updates it, or turns AI agents on there. Use for anything about the hosted lab, its domain, password, Docker image or server-setup.sh.
---

# Deploy the lab

Everything is in `deploy/README.md`. The server commands are the user's to run.
This session cannot reach their server.

- **First install or update:** `sudo bash deploy/server-setup.sh --domain lab.<domain> --console-domain console.<domain>`. It needs DNS A records pointing at the server first.
- **AI agents:** add `--anthropic-key-file /root/anthropic.key`. The key goes only into `deploy/.env` (mode 600). Only then does the lab container get an outbound route (`deploy/docker-compose.ai.yml`). `--no-ai` removes the key, and `--scripted` keeps it but starts scripted.
- **New password:** `--new-password`. The script prints the password once.
- **Before changing anything in `deploy/`:** run `bash deploy/smoke.sh` here. All checks must pass, including "model API key not served to the browser".

Never put a key, password or hash in the repository, a log or a comment.

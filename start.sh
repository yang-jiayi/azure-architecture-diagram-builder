#!/bin/sh
# Start background services, then run nginx in the foreground.
#
# 1. Speech token server (port 3001)
#    If AZURE_SPEECH_REGION is not set the token server logs a warning and
#    /api/speech-token returns 503 — the avatar "Present" button is hidden.
node /srv/token-server/token-server.js &

nginx -g "daemon off;"

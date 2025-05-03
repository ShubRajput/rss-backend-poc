#!/usr/bin/env bash

# Install Chromium for Puppeteer
apt-get update
apt-get install -y chromium

# Optional debug: confirm chromium path
echo "Chromium installed at: $(which chromium)"

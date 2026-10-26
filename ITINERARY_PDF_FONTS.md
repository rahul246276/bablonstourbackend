# PDF fonts

## Chromium installation

Puppeteer 22.15.0 downloads the matching Chrome 127 build during `npm install` via the backend `postinstall` hook. The download is stored under `backend/.cache/puppeteer` and is intentionally not committed. If install scripts were disabled, the download failed, or the cache was removed, run this from the `backend` directory:

```bash
npm run install:chrome
```

Then restart the backend. To use Chrome already installed on the machine instead, set `PUPPETEER_EXECUTABLE_PATH` (or `CHROME_BIN`) to its executable path. The PDF service checks common system Chrome/Chromium locations as a fallback. Production images should install Chrome during image build; do not rely on a runtime download.

Itinerary PDFs use fonts installed on the server. Proposal HTML uses Georgia and Arial with browser-safe fallbacks; the detailed itinerary keeps its existing font declarations. These free system fonts are practical substitutes for the reference’s commercial Georgia Pro, Helvetica LT Pro, Work Sans, Times Bold Condensed, and Corsiva families.

For Debian or Ubuntu based PDF workers, install fonts in the image before launching Node/Puppeteer:

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-liberation fonts-dejavu-core fonts-croscore \
    && rm -rf /var/lib/apt/lists/*
```

Suggested substitutes are Liberation Serif for Georgia/Times, Liberation Sans or Arimo for Helvetica/Work Sans, and Liberation Serif Italic for Corsiva. No font URL is loaded by the PDF; the existing HTTPS image host allowlist remains in force.

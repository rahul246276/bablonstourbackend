# PDF fonts

Itinerary PDFs use fonts installed on the server. Proposal HTML uses Georgia and Arial with browser-safe fallbacks; the detailed itinerary keeps its existing font declarations. These free system fonts are practical substitutes for the reference’s commercial Georgia Pro, Helvetica LT Pro, Work Sans, Times Bold Condensed, and Corsiva families.

For Debian or Ubuntu based PDF workers, install fonts in the image before launching Node/Puppeteer:

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-liberation fonts-dejavu-core fonts-croscore \
    && rm -rf /var/lib/apt/lists/*
```

Suggested substitutes are Liberation Serif for Georgia/Times, Liberation Sans or Arimo for Helvetica/Work Sans, and Liberation Serif Italic for Corsiva. No font URL is loaded by the PDF; the existing HTTPS image host allowlist remains in force.

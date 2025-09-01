# Teevi Live Italy

This repository contains the EPG (Electronic Program Guide) data for Italian free-to-air TV channels. The data is sourced from [open-epg.com](https://www.open-epg.com) and is updated daily using GitHub Actions and published to GitHub Pages.

The TV channels information and streams are sourced from [Free-TV/IPTV](https://github.com/Free-TV/IPTV) project.

## API

The EPG data is available as a JSON file at:

```
https://teeviapp.github.io/teevi-official-extensions/data/live-italy/epg-guide.json
```

The data is formatted to be compatible with [Teevi](https://github.com/teeviapp/teevi-ts).

## Development

To generate the EPG guide locally:

```bash
# Install dependencies
npm install

# Generate EPG guide
npm run make-guide
```

# onoffice-test

Node.js script to export apartments from onOffice, including all property data and related images, into a single JSON file.

## Requirements

- Node.js 18+ (includes native `fetch`)
- onOffice credentials (`TOKEN` and `SECRET`)

## Installation

```bash
npm install
```

## Configuration

1. Copy the example file:

```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:

```env
ONOFFICE_URL=https://api.onoffice.de/api/stable/api.php
ONOFFICE_TOKEN=your_token
ONOFFICE_SECRET=your_secret
```

## Usage

```bash
node export-apartments.js
```

## Output

The script generates a file with a timestamp in its name:

- `export_YYYY-MM-DD_HH-mm-ss.json`

Each apartment includes:

- General data (`id`, address, rooms, rent, etc.)
- `photos`: list of related images with metadata (`url`, `type`, `title`, `originalname`, `modified`)

Simplified example:

```json
[
  {
    "id": "12345",
    "address": {
      "streetName": "Main St",
      "city": "Berlin"
    },
    "rent": {
      "warmRent": 1200,
      "coldRent": 980,
      "currency": "EUR"
    },
    "photos": [
      {
        "url": "https://...",
        "type": "Photo",
        "title": "Living room"
      }
    ]
  }
]
```

## Security

- `.env` is ignored in `.gitignore` to avoid committing credentials.

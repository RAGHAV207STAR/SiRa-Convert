# Backend Setup (Locked PDF Support)

This project now includes a backend unlock API used by:
- `pdf-to-jpg.js`
- `merge-pdf.js`

## Requirements
- Node.js 18+
- `qpdf` installed on the server machine
- No paid API keys required

Install `qpdf`:
- Ubuntu/Debian: `sudo apt-get install qpdf`
- macOS (Homebrew): `brew install qpdf`

## Run
1. Install dependencies:
   - `npm install`
2. Start server:
   - `npm start`
3. Open:
   - `http://localhost:8080`

## API
- `POST /api/unlock-pdf/start`
  - Form fields:
    - `file`: locked PDF
    - `password`: PDF password
  - Response:
    - `202` `{ jobId, status: "running" }`
- `GET /api/unlock-pdf/result/:jobId`
  - Response:
    - `202` job still running
    - `200` unlocked PDF bytes
    - `401` incorrect password
    - `410` canceled
- `POST /api/unlock-pdf/cancel/:jobId`
  - Response:
    - `200` canceled/current state
    - `404` job not found

## Notes
- JPG files themselves do not have a standard password-lock feature. If a JPG cannot be decoded, unlock its source container (for example, a locked ZIP or PDF) first.
- The unlock endpoint includes same-origin checks, request rate limits, and incorrect-password throttling.
- Frontend includes a `Cancel Unlock` control that aborts active unlock jobs.

## Tests
- Run backend tests:
  - `npm test`

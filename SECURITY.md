# Security Policy

## Supported version

Security fixes target the latest version on the default branch.

## Reporting a vulnerability

Do not publish sensitive vulnerability details in a public issue. Use the repository owner's private security reporting channel when available.

Include:

- Affected commit or version.
- Reproduction steps.
- Expected and actual behavior.
- Security impact.
- A minimal test file when file parsing is involved.

## Trust model

FFmpeg Filter Builder is a static browser application with no backend. Its primary protections are:

- No ordinary runtime CDN/API connection (`connect-src 'none'`).
- Explicitly pinned and embedded third-party files.
- Committed runtime / font pins are verified before embedding.
- SHA-256 records in the generated dependency manifest.
- No analytics, telemetry, remote fonts, or silent update checks.
- User-initiated downloads rather than automatic uploads.

A generated HTML file is executable code. Distribute it through a trusted channel and verify hashes for high-trust workflows.


## Input files

The app may parse untrusted local media files. Changes should:

- Validate type, size, and structure before expensive processing.
- Avoid unbounded allocation or recursion.
- Handle malformed data without exposing stack traces to users.
- Release Blob URLs, workers, canvas resources, and large buffers.
- Make destructive transformations reversible where practical.
- Never upload a selected file unless the product explicitly requires it and the user is clearly informed.

## Embedded runtime and font review

Before changing the FFmpeg runtime or Draw Text font:

- Confirm the upstream release / snapshot identity and exact version.
- Review licenses and required notices.
- Update only the reviewed URL / hash values in `runtime.lock.json` or `font.lock.json`.
- Rebuild from a clean cache and verify the downloaded bytes against the committed pins.
- Re-run ST / MT Preview and Full Render regression tests and verify offline behavior.


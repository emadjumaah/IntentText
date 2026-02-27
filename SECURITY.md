# Security Policy

## Supported Versions

Security fixes are provided for the latest released version.

## Reporting a Vulnerability

Please report security issues responsibly.

- Preferred: open a GitHub Security Advisory (if enabled for the repository)
- Otherwise: open a GitHub issue with minimal details and mark it clearly as security-related

When reporting, include:

- A clear description of the issue
- Minimal reproduction steps
- Expected vs actual behavior
- Any relevant `.it` input that triggers the issue

## Security Notes

- The HTML renderer is intended to be safe-by-default by escaping content and sanitizing URLs.
- If you embed rendered HTML into a web application, follow standard web security practices (CSP, output encoding, etc.).

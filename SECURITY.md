# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in ntelioUI2, please report it responsibly.

**Do NOT open a public issue.** Instead, please use [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).

We will acknowledge your report within 48 hours and aim to release a fix within 7 days for critical issues.

## Scope

ntelioUI2 is a client-side UI framework. Security concerns most relevant to this project include:

- **XSS (Cross-Site Scripting)** — Unsanitized HTML injection via widget templates or user-supplied content
- **Prototype pollution** — Unsafe object merging in configuration handling
- **Dependency vulnerabilities** — Issues in jQuery or Bootstrap loaded via CDN

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| < 2.0   | No        |

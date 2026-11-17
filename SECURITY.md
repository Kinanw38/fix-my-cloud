# Security

Fix My Cloud is a static website. It has no server, no accounts, no database, no cookies and no third-party requests.
The only runtime code is in this repository, and there are no runtime dependencies.

## Reporting a problem

Please use GitHub's private vulnerability reporting (the Security tab of the repository, "Report a vulnerability").
Do not open a public issue for a security problem. Describe what you found and how to reproduce it.

## What is in scope

- Ways to run attacker-controlled code in the page (XSS), for example through the code you type or a level file.
- Ways to make the checker hang the browser (ReDoS) with a crafted input.
- Anything that makes the page contact another origin.

## Good to know

- The Content-Security-Policy is set with a `<meta>` tag, which cannot set `frame-ancestors`. Real response headers need a server.
- Scenarios are simplified and fictional. Code in this project is for practice. Do not run it against a real cloud account.
- All sample secrets are obviously fake and do not match real provider patterns.

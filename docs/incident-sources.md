# Incident sources

Every real-world claim in the game comes from the sources below and nowhere else. A source starts as `verified: false`.
Until at least one source of a level is verified, its "What really happened" card shows only "Inspired by a common pattern" and the lesson.
No company name, date, number or link is shown.

## How to verify a source

1. Open the link.
2. Check that the page really says what the summary says (the fact column).
3. Tick the box and write the date you checked.
4. Set `verified: true` for that source in the level file under `src/levels/`.

Only verified links are shown to players, and only for entries that have at least one verified source.

## INC-0002: The key in the repo

### Elektra-Leak campaign

> Researchers at Palo Alto Networks tracked a campaign that harvested AWS credentials exposed in public GitHub repositories to launch EC2 instances for crypto mining. They observed at least 474 unique compute-optimized instances.

- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - Dark Reading: Elektra-Leak: <https://www.darkreading.com/cloud-security/elektra-leak-attackers-harvest-aws-cloud-keys-github-campaign>

### Access key in a public repository (2015)

> A developer was billed about $6,500 after miners used an access key found in code in a public GitHub repository. AWS later refunded the bill.

- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - AWS Insider, 2015: <https://awsinsider.net/articles/2015/09/08/aws-bug-bill.aspx>

### Community report of a leaked token (2022)

> In October 2022 a user on r/AWSCertifications described leaking an AWS access token on GitHub. Large EC2 instances were then launched in several regions.

- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - r/AWSCertifications thread: <https://www.reddit.com/r/AWSCertifications/comments/y7r9wl/account_hacked/>

### Uber (2016)

> Attackers used credentials found in a private GitHub repository to reach AWS data. Uber later said the repository lacked multi-factor authentication.

- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - The Register, 2018: <https://www.theregister.com/2018/02/07/uber_quit_github_for_custom_code_after_2016_data_breach/>

## INC-0003: The PR title that ran commands

### Nx (2025)

> A workflow echoed a pull request title inside a run step. An attacker used that injection to trigger a more privileged workflow and exfiltrate an npm token.

- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - Socket: CI/CD security glossary: <https://socket.dev/glossary/ci-cd-security.md>

### Ultralytics (2024)

> In December 2024 a script injection in GitHub Actions led to trojanized versions of the Python package on PyPI.

- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - CSO Online: <https://www.csoonline.com/article/3619159/supply-chain-compromise-of-ultralytics-ai-library-results-in-trojanized-versions.html>

## INC-0004: The destroy that ate production

### DataTalks.Club (2026)

> On 26 February 2026 an AI coding agent ran terraform destroy against production using a state file that pointed at it. The database and its automated snapshots were deleted, and the data was restored with AWS support about a day later.

- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - Founder postmortem: <https://alexeyondata.substack.com/p/how-i-dropped-our-production-database>
- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - Gruntwork: AI with Terraform: <https://gruntwork.io/blog/thinking-of-using-ai-with-terraform>

## INC-0005: The metadata service

### Capital One (2019)

> A misconfigured web application firewall let an intruder relay requests to a back-end resource. Public analyses commonly describe an SSRF reaching the instance metadata service and temporary role credentials with broad S3 access, though analysts differ on the exact mechanism.

- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - Krebs on Security: <https://krebsonsecurity.com/2019/08/what-we-can-learn-from-the-capital-one-hack/>
- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - CloudSEK analysis: <https://www.cloudsek.com/ar/knowledge-base/capital-one-data-breach>

## INC-0006: The label that vanished

### Reddit (2023)

> On 14 March 2023, after an upgrade to Kubernetes 1.24, the deprecated node-role.kubernetes.io/master label was no longer present. Route reflector selectors that depended on it stopped matching, and the incident lasted 314 minutes.

- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - r/RedditEng post: <https://www.reddit.com/r/RedditEng/comments/11xx5o0/>
- [ ] Maintainer verified this link and fact. Retrieved: ____-__-__
  - Geek Cookbook post-mortem: <https://geek-cookbook.funkypenguin.co.nz/blog/2023/03/24/post-mortem-reddit-pi-day-kube-1.25/>


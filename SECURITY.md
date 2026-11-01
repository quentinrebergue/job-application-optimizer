# Security policy

## Reporting a vulnerability

Please report it privately, not in a public issue:

- on GitHub: **Security > Report a vulnerability** on this repository, or
- by email to **contact@fastresume.tech**, with "security" in the subject.

Give what is needed to reproduce it: the address or the file, the steps, and what you saw. I will answer within a week, say
whether it is confirmed, and tell you when it is fixed. This is a project run by one person: there is no bounty, but I will
credit you if you wish.

## What is in scope

The application at [fastresume.tech](https://fastresume.tech) and the code of this repository: the app, the Go services
(`services/`), the Kubernetes manifests (`k8s/`) and the delivery workflows (`.github/`). Please do not run load or
denial-of-service tests against the site, do not read or change the data of other people's accounts, and stop at proof of
the problem: a screenshot or one request is enough.

## What is already known

[`docs/security.md`](docs/security.md) lists what is protected and how, the secrets and how they are rotated, and the
findings of the last review, including what is known and not fixed yet.

## Supported versions

Only the latest commit of `master`, which is what runs in production.

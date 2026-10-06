# FastResume charter

What FastResume is, what it promises, and what it will never do. The README, the landing page, the privacy page and the funding page say the same thing as this page; when they disagree, this page wins and the others are fixed.

## Mission

Help anyone send a resume tailored to each job offer, in a few clicks, without paying and without giving their data away.

## The three clicks

1. **Import** the job offer.
2. **Rank**: the AI picks the experiences, projects and skills of your library that match the offer best.
3. **Download** the PDF of your tailored resume.

You fill your library once (experiences, projects, skills, education); after that, every offer is three clicks away.

Slogan: **"One job. One resume. Three clicks."** (other ideas and why they were not kept: `docs/brand/slogans.md`)

## Promises

| Promise | What it means | Status |
|---|---|---|
| **Free** | Every feature, for everyone. No paid tier, no feature held back. | True |
| **Open source** | The code is public, under the AGPL-3.0: anyone can read it, run it, improve it; a hosted copy must stay open too. | When the repository goes public (#107) |
| **Funded by donations** | Running costs (servers, AI, domain) are paid by donations, and the money raised and spent is public. Non-profit at heart: donations pay the costs first. | Funding page (#111) |
| **Your data is yours** | Never sold, never used for ads, never used to train an AI model. Export all of it or delete your account at any time. | Export and delete (#104) |
| **Hosted in France** | The app and its database run on OVHcloud servers in France, under European law (GDPR). | True |
| **AI that stays in France** | The AI runs on open-source models hosted by OVHcloud in France; what you send is neither kept nor used for training. | OVHcloud AI Endpoints (#44) |
| **No tracking** | No analytics, no ads, no third-party cookies. Only the cookie that keeps you signed in. | True |
| **Honest AI** | The AI chooses and orders what you wrote. It never invents an experience, a skill or a number. | True for the ranking; a rule for every future AI feature |

A promise is only shown on the landing page once its status is "True".

## What FastResume will never do

- Sell, rent or share your data, or show you ads.
- Put a feature behind a paywall or a "premium" plan.
- Use your resume, your offers or your writing to train a model.
- Use dark patterns: fake urgency, hidden settings, pre-ticked boxes, hard-to-find account deletion.
- Write things in your resume that you did not write or do.

## How it is run

- One maintainer for now; decisions are written in GitHub issues, the roadmap is public.
- Security problems: see `SECURITY.md` (#107).
- Contributions are welcome: see `CONTRIBUTING.md`.

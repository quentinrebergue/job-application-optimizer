# Incident: <short title that says what broke>

> Copy this file to `YYYY-MM-DD-short-slug.md`, fill it in, delete the guidance
> in italics. Blameless: describe what the system and the process allowed, never
> who made a mistake.

| | |
|---|---|
| **Date** | YYYY-MM-DD |
| **Severity** | SEV1 / SEV2 / SEV3 / SEV4 (see the [README](README.md#severity)) |
| **Status** | Draft / Mitigated / Resolved / Actions in progress / Closed |
| **Services affected** | *e.g. app, resume-renderer, database* |
| **Detected by** | *Alert, user report, someone watching, ... Say "luck" if it was luck* |

### Key times

| Metric | Value |
|---|---|
| Start of impact | HH:MM |
| Detected | HH:MM |
| Mitigated (service back, cause maybe still there) | HH:MM |
| Resolved (cause fixed) | HH:MM or "not yet" |
| **Time to detect** | *detected - start* |
| **Time to mitigate** | *mitigated - start* |

## 1. Summary

*Three to five sentences a stranger can read in 30 seconds: what broke, for how
long, what the cause was, how it was fixed. Write it last.*

## 2. Impact

*Who or what was affected and how much. Prefer numbers: minutes of downtime,
error rate, requests lost, data lost or not. Say explicitly "no data loss" if
that is the case.*

## 3. Timeline

*All times in one time zone, from the event logs, not from memory. Include the
facts before the incident (the change that triggered it) and the recovery.*

| Time | Event |
|---|---|
| HH:MM:SS | |

## 4. Detection

*How did we find out, and how could we have found out sooner? Then the path of
the investigation: each question asked, the command used, and what it showed.
This is the part another engineer can reuse next time.*

| # | Question | Command | What it showed |
|---|---|---|---|
| 1 | | | |

**Could an alert have caught it?** *Which one, and why it did not exist.*

## 5. Root cause analysis

**Trigger:** *what happened right before (a deployment, a traffic spike, ...).*
A trigger is not a cause: the system should survive it.

**Root cause:** *the weakness that turned the trigger into an incident.*

**Why chain** *(keep asking why until you reach something you can change)*:

1. Why did the service fail? ...
2. Why? ...
3. Why? ...

**Contributing factors:** *each one made it worse or longer.*

- ...

## 6. Resolution

*What was done to restore service (mitigation) and what was done to remove the
cause (fix). Include the commands, so the next person can copy them.*

## 7. What went well / badly / by luck

| Went well | Went badly | Lucky |
|---|---|---|
| | | |

*"Lucky" is the most useful column: things that could have made it worse and did
not, by chance and not by design.*

## 8. Action items

*Every item needs a type, a priority, a status and, once created, a link. An
action with no owner or no link is a wish.*

| # | Action | Type | Priority | Status | Link |
|---|---|---|---|---|---|
| 1 | | Prevent / Detect / Mitigate | P0-P3 | To do / Doing / Done | |

Types: **Prevent** (so it cannot happen), **Detect** (so we know sooner),
**Mitigate** (so it hurts less).

## 9. Lessons

*Short, general statements that would still be true on another system.*

## 10. Supporting data

*Raw material: key log lines, event output, graphs, relevant config. Remove any
secret, token or personal data before committing.*

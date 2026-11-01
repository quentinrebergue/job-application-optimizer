# src/emails

The mails of the app, as React Email components. `src/lib/email/` sends them.

| File | Description |
|---|---|
| `EmailLayout.tsx` | The frame every mail shares |
| `theme.ts` | The brand values for mails (mail clients ignore CSS variables); a test checks them against `globals.css` |
| `messages.tsx` | Turns a component into what `sendEmail()` takes: the HTML and the plain-text version |
| `VerifyEmail.tsx`, `EmailAlreadyUsed.tsx` | Confirm an address; tell an owner someone tried to sign up with theirs |
| `ResetPassword.tsx`, `PasswordChanged.tsx` | The reset link; notice that the password changed |
| `ChangeEmail.tsx`, `EmailChangeRequested.tsx`, `EmailChanged.tsx` | The link to confirm a new address; notices to the old one |
| `DataExported.tsx`, `AccountDeleted.tsx` | Notices that the data was downloaded and that the account was deleted |

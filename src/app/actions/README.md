# src/app/actions

Server Actions: what the forms of the account pages submit. Each checks its input, then calls `src/lib`.

| File | Description |
|------|-------------|
| `auth.ts` | `signup`, `login`, `logout`. |
| `password-reset.ts` | `forgotPassword` (same answer whether the account exists or not) and `setNewPassword` (the token is used here, not when the page opens). |
| `email-verification.ts` | `resendVerification`: the button of the confirmation banner. |
| `email-change.ts` | `confirmEmailChangeAction`: the address changes on a click, not when the link opens. |

Each `*.test.ts` and `*.db.test.ts` tests the file of the same name.

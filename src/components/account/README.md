# src/components/account

The account page (`/account`, #104, #236): password, address, your data, deletion.

## Files

| File | Description |
|------|-------------|
| `ExportButton.tsx` | "Download my data": asks the password, posts it to `/api/account/export` and saves the JSON file; a refusal (too many exports) is shown in an `Alert`, not saved as a file. |
| `DeleteAccount.tsx` | "Delete my account": a drawer where the user types the account's email again and gives the password; the red button stays off until it matches and a password is given. Calls `DELETE /api/account` (the owner gets a mail), then goes to the landing page. |
| `ChangePassword.tsx` | Current and new password (#236); says the other devices were signed out. |
| `ChangeEmail.tsx` | New address and password (#236); says where the link went: the address changes when it is opened. |

// Features switched off in the frontend while they are reworked. Turning one
// back on is a one-line change here.

export const FEATURES = {
  /** LinkedIn bookmarklet: "LinkedIn Import" button and /jobs/bookmarklet. Set aside for a one-click import (#81). */
  linkedinImport: false,
  /** Cover letter tab of a job: shown greyed out as "Soon" while off. */
  coverLetter: false,
} as const

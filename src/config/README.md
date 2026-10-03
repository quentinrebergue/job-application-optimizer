# src/config

Application-wide configuration: constants, entity type registry, and module registry. All values are barrel-exported from `index.ts`.

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export |
| `constants.ts` | `DEFAULT_QUESTION_COUNT`, `APPLICATION_STATUSES`, status labels and badge variants (`APPLICATION_STATUS_BADGES`), difficulty label+color maps |
| `entity-types.ts` | `ENTITY_TYPE_CONFIGS` array (id, label, plural, icon per type), `ENTITY_TYPE_IDS`, `getEntityTypeConfig(id)` helper |
| `modules.ts` | `MODULE_CONFIGS` array (id, label, href, alsoActiveOn, icon, color, description, enabled for each app module); `ENABLED_MODULES` and `isModuleEnabled(id)` drive the app header, the dashboard and the 404 of switched-off modules |
| `features.ts` | `FEATURES` switches for features hidden in the frontend while reworked (`linkedinImport`: bookmarklet, see #81; `coverLetter`: cover letter tab, shown greyed out "Soon") |
| `decisionTree.ts` | `PATTERNS`/`Pattern` (the coding-pattern taxonomy: Sliding Window, DFS, DP, …), `DECISION_TREE` (flat template of `DecisionNode`s with `parentId` links), `getDecisionPath(pattern)` to compute the root-to-leaf path, `getRuledOutAlternatives(pattern)` for the sibling patterns ruled out at the final branching node, `getChildren(nodeId)` for the tree-diagram rows — all rendered by `DecisionTreeView` |
| `resume.ts` | `FIXED_TEMPLATE_OPTIONS` — template options the app sets itself (date placement on the right), applied to the templates that declare them and not offered in the picker |

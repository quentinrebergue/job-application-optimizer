# src/config

Application-wide configuration: constants, entity type registry, and module registry. All values are barrel-exported from `index.ts`.

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export |
| `constants.ts` | `DEFAULT_QUESTION_COUNT`, `APPLICATION_STATUSES`, status/difficulty label+color maps |
| `entity-types.ts` | `ENTITY_TYPE_CONFIGS` array (id, label, plural, icon per type), `ENTITY_TYPE_IDS`, `getEntityTypeConfig(id)` helper |
| `modules.ts` | `MODULE_CONFIGS` array (id, label, href, icon, color, description for each app module) used by the Sidebar and Dashboard |
| `decisionTree.ts` | `PATTERNS`/`Pattern` (the coding-pattern taxonomy: Sliding Window, DFS, DP, …), `DECISION_TREE` (flat template of `DecisionNode`s with `parentId` links), `getDecisionPath(pattern)` to compute the root-to-leaf path, `getRuledOutAlternatives(pattern)` for the sibling patterns ruled out at the final branching node, `getChildren(nodeId)` for the tree-diagram rows — all rendered by `DecisionTreeView` |

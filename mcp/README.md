# mcp/

Model Context Protocol server for the Job Application Optimizer.
Exposes tools so an AI agent (Copilot, Claude, Cursor) can manage job applications, resume entities, taxonomy tags, and project imports directly.

## Running

```bash
npx tsx mcp/server.ts        # manual run (for debugging)
npm run mcp                  # alias
```

VS Code: already configured via `.vscode/mcp.json` — just enable MCP in VS Code settings.

## Files

| File | Description |
|------|-------------|
| `server.ts` | Entry point (~62 lines). Wires up the MCP `Server`, delegates `ListTools` to `TOOL_DEFINITIONS` and `CallTool` to `handleToolCall`. |
| `config.ts` | Exports `DATA_DIR` and `JOBS_DIR` constants (derived from `process.cwd()`). |
| `tool-definitions.ts` | Exports `TOOL_DEFINITIONS` — all 20 tool InputSchema definitions as a pure data array (no logic). |
| `call-handlers.ts` | Exports `handleToolCall(name, args)` — all if-branches for every tool. Imports from `config`, `jobs`, `entities`, `taxonomy`, `project-analyzer`. |
| `jobs.ts` | `createJob`, `listJobs`, `updateJobStatus`, `setJobProfile`, `updateJobTags`, `readJob`. Reads/writes `data/jobs/`. |
| `jobs.test.ts` | 12 unit tests for `jobs.ts` using a tmpdir. |
| `entities.ts` | `createExperience`, `createProject`, `createSkill`, `createEducation`, `listEntities`. Reads/writes `data/entities/`. |
| `entities.test.ts` | 10 unit tests for `entities.ts` using a tmpdir. |
| `taxonomy.ts` | MCP wrappers (`createTaxonomyNode`, `updateTaxonomyNode`, `deleteTaxonomyNode`, `addTaxonomyAlias`, `removeTaxonomyAlias`, `reconcileTags`) that delegate to `src/lib/data/taxonomy.ts` via a GPT-powered reconciler. |
| `project-analyzer.ts` | `readProjectFiles` (real codebase), `readStagingProject` (from `data/projects/`), `listStagingProjects`, `analyzeProject` (GPT call → title, tech, description, tags, readme, questions). |

## Tool domains

| Domain | Tools |
|--------|-------|
| Jobs | `create_job`, `list_jobs`, `update_job_status`, `tag_job`, `set_job_profile` |
| Entities | `create_experience`, `create_project`, `create_skill`, `create_education`, `list_entities` |
| Taxonomy | `get_taxonomy`, `create_taxonomy_node`, `update_taxonomy_node`, `delete_taxonomy_node`, `add_node_alias`, `remove_node_alias`, `reconcile_tags` |
| Projects | `list_raw_projects`, `analyze_project`, `import_project` |

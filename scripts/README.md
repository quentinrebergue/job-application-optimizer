# scripts

Maintenance scripts, run by hand from a development machine.

| Path | Description |
|---|---|
| `monitoring-profile.sh` | Switches the monitoring stack between the `normal` and `minimal` profiles (Grafana off to save memory) |
| `stack.sh` | The whole local stack in one command (`npm run stack`): the database, the migrations, the services in Docker, then the app; also `seed`, `restore`, `status`, `logs`, `down`, `reset` |
| `demo-seed.sql` | The fictional demo account that `stack.sh seed` creates |
| `node-memory.sh` | The memory margin of the node before Kubernetes starts to evict pods |
| `pdf-compare.sh` | Reads one PDF with several tools and writes what each gives, to compare them |
| `brand-icons.mjs` | Builds the app icons from the logo source in `docs/brand/` |
| `export-removed-modules.sql` | Exports the content of the modules removed from the app, before their tables were dropped |
| `eval-ranking/` | The AI ranking evaluation tool (`npm run eval:ranking`); how to use it: [`eval/README.md`](../eval/README.md) |
| `eval-import/` | The functional test of the resume import with real PDFs (`npm run eval:import`) |

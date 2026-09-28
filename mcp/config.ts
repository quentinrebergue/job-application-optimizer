import path from 'path'

// process.cwd() is the workspace root — reliable in both terminal and VS Code MCP launch
export const DATA_DIR = path.join(process.cwd(), 'data')
export const JOBS_DIR = path.join(DATA_DIR, 'jobs')

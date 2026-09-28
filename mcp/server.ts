#!/usr/bin/env node
/**
 * JobApplicationOptimizer — MCP Server
 *
 * Exposes tools for an AI agent to manage job applications, resume entities,
 * taxonomy tags, and project imports.
 *
 * ─── Setup: VS Code Copilot ────────────────────────────────────────────────
 *   Already configured in .vscode/mcp.json — enable MCP in VS Code settings.
 *
 * ─── Setup: Claude Desktop ────────────────────────────────────────────────
 *   Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "job-optimizer": {
 *         "command": "npx",
 *         "args": ["tsx", "/Users/quentinrebergue/JobApplicationOptimizer/mcp/server.ts"]
 *       }
 *     }
 *   }
 *
 * ─── Setup: Cursor ─────────────────────────────────────────────────────────
 *   Settings → MCP → add server:
 *     command: npx tsx /Users/quentinrebergue/JobApplicationOptimizer/mcp/server.ts
 *
 * ─── Tool domains ──────────────────────────────────────────────────────────
 *   Jobs        — create_job, list_jobs, update_job_status, tag_job, set_job_profile
 *   Entities    — create_experience, create_project, create_skill, create_education, list_entities
 *   Taxonomy    — get_taxonomy, create/update/delete_taxonomy_node, add/remove_node_alias, reconcile_tags
 *   Projects    — list_raw_projects, analyze_project, import_project
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { TOOL_DEFINITIONS } from './tool-definitions.js'
import { handleToolCall } from './call-handlers.js'

const server = new Server(
  { name: 'job-optimizer', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params
  return handleToolCall(name, args as Record<string, unknown>)
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('MCP server error:', err)
  process.exit(1)
})


/**
 * call-handlers.ts
 *
 * Dispatches an MCP tool call to the handler module for its domain.
 * Each handler corresponds to a tool defined in tool-definitions.ts.
 *
 * Returns the MCP `content` response object for a given tool name + args.
 */

import { handleJobToolCall } from './call-handlers-jobs.js'
import { handleEntityToolCall } from './call-handlers-entities.js'
import { handleProjectToolCall } from './call-handlers-projects.js'
import type { ToolResult } from './tool-result.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleToolCall(name: string, args: Record<string, any>): Promise<ToolResult> {
  const result =
    (await handleJobToolCall(name, args)) ??
    (await handleEntityToolCall(name, args)) ??
    (await handleProjectToolCall(name, args))

  return result ?? { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
}

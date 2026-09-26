import z from "zod";
import defineAgent from "../agent/define-agent.js";
import defineTool from "./define-tool.js";

const input = z.object({ count: z.number() });
const output = z.object({ ok: z.boolean() });
const base = { name: "test", description: "Test", input, output };
const handler = async () => ({
	error: undefined,
	data: { output: { ok: true } },
});

defineTool({
	...base,
	target: "agent",
	permissions: [],
	handler: async ({ input, execution }) => {
		const count: number = input.count;
		const operationId: string = execution.operationId;
		// @ts-expect-error Agent authority has permissions, not external scopes.
		execution.authority.scopes;
		// @ts-expect-error Runs acting as the system have no user.
		execution.authority.principal.userId;
		const userId: number | null =
			execution.authority.principal.type === "user"
				? execution.authority.principal.userId
				: null;
		return {
			error: undefined,
			data: {
				output: { ok: count > 0 && userId !== 0 },
				widgets: [{ key: operationId, version: 1, data: { count } }],
			},
		};
	},
});

defineTool({
	...base,
	target: "mcp",
	scopes: [],
	handler: async ({ execution }) => {
		// @ts-expect-error MCP execution has no agent operation id.
		execution.operationId;
		// @ts-expect-error MCP authority has scopes, not user permissions.
		execution.authority.permissions;
		return {
			error: undefined,
			data: { output: { ok: true }, content: [{ type: "text", text: "ok" }] },
		};
	},
});

// @ts-expect-error A definition has exactly one target.
defineTool({ ...base, target: ["agent", "mcp"], scopes: [], handler });
// @ts-expect-error Agent definitions use permissions.
defineTool({ ...base, target: "agent", permissions: [], scopes: [], handler });
// @ts-expect-error MCP definitions use scopes.
defineTool({ ...base, target: "mcp", scopes: [], permissions: [], handler });
defineTool({
	...base,
	target: "agent",
	permissions: [],
	// @ts-expect-error Agent handlers cannot return MCP content blocks.
	handler: async () => ({
		error: undefined,
		data: {
			output: { ok: true },
			content: [{ type: "text", text: "wrong target" }],
		},
	}),
});
defineTool({
	...base,
	target: "mcp",
	scopes: [],
	// @ts-expect-error MCP handlers cannot return widgets.
	handler: async () => ({
		error: undefined,
		data: {
			output: { ok: true },
			widgets: [{ key: "test", version: 1, data: {} }],
		},
	}),
});

const mcpTool = defineTool({ ...base, target: "mcp", scopes: [], handler });
defineAgent({
	key: "test",
	name: "Test",
	description: "Test",
	// @ts-expect-error Agents only accept agent tools.
	tools: [mcpTool],
});

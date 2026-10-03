import z from "zod";
import defineAgent from "../agent/define-agent.js";
import { copy } from "../i18n/index.js";
import defineAgentTool from "./define-agent-tool.js";
import defineMcpTool from "./define-mcp-tool.js";

const input = z.object({ count: z.number() });
const output = z.object({ ok: z.boolean() });
const base = { name: "test", description: "Test", input, output };
const handler = async () => ({
	error: undefined,
	data: { output: { ok: true } },
});

defineAgentTool({
	...base,
	permissions: [],
	handler: async ({ input, execution, toolkit }) => {
		toolkit.documents.getMultiple;
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
				summary: copy("admin:test.items.checked", {
					data: { count },
					defaultMessage: "Checked {{count}} items.",
				}),
				widgets: [{ key: operationId, version: 1, data: { count } }],
			},
		};
	},
});

defineMcpTool({
	...base,
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

// @ts-expect-error Agent tools use permissions, not scopes.
defineAgentTool({ ...base, permissions: [], scopes: [], handler });
// @ts-expect-error MCP tools use scopes, not permissions.
defineMcpTool({ ...base, scopes: [], permissions: [], handler });
defineAgentTool({
	...base,
	permissions: [],
	// @ts-expect-error Agent handlers cannot return MCP content blocks.
	handler: async () => ({
		error: undefined,
		data: {
			output: { ok: true },
			summary: "Checked the items.",
			content: [{ type: "text", text: "wrong target" }],
		},
	}),
});
defineMcpTool({
	...base,
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

const mcpTool = defineMcpTool({ ...base, scopes: [], handler });
defineAgent({
	key: "test",
	name: "Test",
	description: "Test",
	// @ts-expect-error Agents only accept agent tools.
	tools: [mcpTool],
});

defineAgentTool({
	...base,
	permissions: [],
	// @ts-expect-error Agent tool results require a transcript summary.
	handler,
});

defineAgentTool({
	...base,
	permissions: [],
	// @ts-expect-error Agent tool summaries cannot use server copy.
	handler: async () => ({
		error: undefined,
		data: {
			output: { ok: true },
			summary: copy("server:test.items.checked"),
		},
	}),
});

// Interaction schemas infer preparation data, response choices, and the final handler input.
defineAgentTool({
	...base,
	permissions: [],
	readOnly: true,
	interaction: {
		key: "picker",
		version: 1,
		data: z.object({ ids: z.array(z.number()) }),
		response: (data) =>
			z.object({ id: z.number().refine((id) => data.ids.includes(id)) }),
		prepare: async ({ input }) => ({
			error: undefined,
			data: {
				interaction: {
					title: "Choose",
					placement: "inline",
					data: { ids: [input.count] },
				},
			},
		}),
	},
	handler: async ({ input, response, data }) => {
		const id: number = response.id;
		const count: number = input.count;
		const choices: number[] = data.ids;
		// @ts-expect-error Response types come from the schema.
		response.id satisfies string;
		return {
			error: undefined,
			data: {
				output: { ok: choices.includes(id) && count > 0 },
				summary: `Selected item ${id}.`,
			},
		};
	},
});

defineMcpTool({
	...base,
	scopes: [],
	// @ts-expect-error Approval policy is specific to agent tools.
	requiresApproval: true,
	handler,
});

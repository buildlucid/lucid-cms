import z from "zod";
import defineTool from "./define-tool.js";

const base = {
	name: "test",
	description: "Test",
	input: z.object({ count: z.number() }),
	output: z.object({ ok: z.boolean() }),
};

const both = defineTool({
	...base,
	agent: { permissions: [] },
	mcp: { scopes: [] },
	handler: ({ input, execution }) => {
		const count: number = input.count;
		// @ts-expect-error Only agent runs have an actor, so check the surface first.
		execution.actor;
		if (execution.surface === "agent") execution.actor;
		return { output: { ok: count > 0 }, summary: "Checked." };
	},
});
both.agent.kind satisfies "agent";
both.mcp.kind satisfies "mcp";

const agentOnly = defineTool({
	...base,
	agent: { permissions: [] },
	handler: ({ execution }) => {
		execution.actor;
		execution.run.id satisfies string;
		return { output: { ok: true } };
	},
});
// @ts-expect-error A tool without an `mcp` block has no MCP definition.
agentOnly.mcp;

const mcpOnly = defineTool({
	...base,
	mcp: { scopes: [] },
	handler: ({ execution }) => {
		// @ts-expect-error MCP calls have no actor.
		execution.actor;
		return { output: { ok: true } };
	},
});
// @ts-expect-error A tool without an `agent` block has no agent definition.
mcpOnly.agent;

defineTool({
	...base,
	mcp: { scopes: [] },
	// @ts-expect-error The output must match the output schema.
	handler: () => ({ output: { ok: "yes" } }),
});

defineTool({
	...base,
	// @ts-expect-error Interactive tools need a person to answer, so they can't also have an `mcp` block.
	agent: {
		permissions: [],
		interaction: {
			key: "test-widget",
			version: 1,
			data: z.object({ options: z.array(z.string()) }),
			response: () => z.object({ picked: z.string() }),
			prepare: () => ({
				interaction: {
					title: "Pick one",
					placement: "inline",
					data: { options: ["a"] },
				},
			}),
		},
	},
	mcp: { scopes: [] },
	handler: () => ({ output: { ok: true } }),
});

import {
	CLIENT_CAPABILITIES_META_KEY,
	CLIENT_INFO_META_KEY,
	PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { afterAll, expect, test } from "vitest";
import z from "zod";
import createServiceContext from "../../utils/services/create-service-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { createTranslationStore } from "../i18n/index.js";
import { ExternalScopes } from "../permission/external-scopes.js";
import defineTool from "../tools/define-tool.js";
import { createToolHandler } from "./create-tool-handler.js";

const testConfig = getTestConfig();
afterAll(testConfig.destroy);

const echo = defineTool({
	name: "test_echo",
	description: "Echoes text",
	input: z.object({ message: z.string() }),
	output: z.object({ message: z.string() }),
	scopes: [],
	handler: async ({ input }) => ({ error: undefined, data: input }),
});
const restricted = defineTool({
	name: "test_restricted",
	description: "Restricted dummy",
	input: z.object({}),
	output: z.object({ ok: z.boolean() }),
	scopes: [ExternalScopes.LocalesRead],
	handler: async () => ({ error: undefined, data: { ok: true } }),
});

const post = (method: string, params: Record<string, unknown>, modern = true) =>
	new Request("http://localhost:8080/lucid/mcp", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			...(modern
				? {
						"mcp-protocol-version": "2026-07-28",
						"mcp-method": method,
						...(method === "tools/call" && typeof params.name === "string"
							? { "mcp-name": params.name }
							: {}),
					}
				: {}),
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method,
			params: {
				...params,
				...(modern
					? {
							_meta: {
								[PROTOCOL_VERSION_META_KEY]: "2026-07-28",
								[CLIENT_INFO_META_KEY]: { name: "test", version: "1" },
								[CLIENT_CAPABILITIES_META_KEY]: {},
							},
						}
					: {}),
			},
		}),
	});

test("SDK serves the active tool catalogue and calls in both protocol eras", async () => {
	const base = await testConfig.getConfig();
	const config = {
		...base,
		mcp: { enabled: true },
		tools: { definitions: [restricted, echo], disabled: [] },
	};
	const context = createServiceContext({
		config,
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	const handler = createToolHandler({
		context,
		authority: {
			principal: { type: "system" },
			scopes: [ExternalScopes.McpAccess],
		},
	});

	const modernList = await handler.fetch(post("tools/list", {}));
	expect(modernList.status).toBe(200);
	const listed = await modernList.json();
	expect(
		listed.result.tools.map((tool: { name: string }) => tool.name),
	).toEqual(["test_echo"]);

	const call = await handler.fetch(
		post("tools/call", {
			name: "test_echo",
			arguments: { message: "hello" },
		}),
	);
	expect(call.status).toBe(200);
	expect((await call.json()).result.structuredContent).toEqual({
		message: "hello",
	});

	const legacyList = await handler.fetch(post("tools/list", {}, false));
	expect(legacyList.status).toBe(200);
	const legacyBody = await legacyList.text();
	expect(legacyBody).toContain("test_echo");
	expect(legacyBody).not.toContain("test_restricted");

	const disabled = createToolHandler({
		context: {
			...context,
			config: {
				...config,
				tools: { ...config.tools, disabled: ["test_echo"] },
			},
		},
		authority: { principal: { type: "system" }, scopes: [] },
	});
	const disabledList = await disabled.fetch(post("tools/list", {}));
	expect((await disabledList.json()).result.tools).toEqual([]);
	const disabledCall = await disabled.fetch(
		post("tools/call", {
			name: "test_echo",
			arguments: { message: "hello" },
		}),
	);
	expect((await disabledCall.json()).error).toBeDefined();
});

test("tool input is parsed once, so transforms reach the handler intact", async () => {
	const measure = defineTool({
		name: "test_measure",
		description: "Measures text",
		input: z.object({ length: z.string().transform((text) => text.length) }),
		output: z.object({ length: z.number() }),
		scopes: [],
		handler: async ({ input }) => ({ error: undefined, data: input }),
	});
	const base = await testConfig.getConfig();
	const handler = createToolHandler({
		context: createServiceContext({
			config: { ...base, tools: { definitions: [measure], disabled: [] } },
			database: await testConfig.getDatabase(),
			translationStore: createTranslationStore({
				defaultLocale: "en",
				bundles: {},
			}),
		}),
		authority: { principal: { type: "system" }, scopes: [] },
	});

	const call = await handler.fetch(
		post("tools/call", {
			name: "test_measure",
			arguments: { length: "hello" },
		}),
	);
	expect((await call.json()).result.structuredContent).toEqual({ length: 5 });
});

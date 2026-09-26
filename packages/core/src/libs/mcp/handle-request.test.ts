import {
	CLIENT_CAPABILITIES_META_KEY,
	CLIENT_INFO_META_KEY,
	PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { Hono } from "hono";
import { afterAll, expect, test, vi } from "vitest";
import z from "zod";
import type { LucidHonoGeneric } from "../../types/hono.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { externalScopeCheck } from "../http/middleware/external-scopes.js";
import { createTranslationStore } from "../i18n/index.js";
import {
	type ExternalScope,
	ExternalScopes,
} from "../permission/external-scopes.js";
import defineTool from "../tools/define-tool.js";
import { handleMcpRequest } from "./handle-request.js";

const fixture = getTestConfig();
afterAll(fixture.destroy);

test("HTTP preflight challenges missing input-dependent scopes before running the tool", async () => {
	const handler = vi.fn(async () => ({
		error: undefined,
		data: {
			output: { ok: true },
		},
	}));
	const tool = defineTool({
		target: "mcp",
		name: "test_dynamic",
		description: "Checks input-dependent scope authorization",
		input: z.object({ resource: z.string().trim() }),
		output: z.object({ ok: z.boolean() }),
		scopes: [],
		requiredScopes: ({ resource }) =>
			resource === "media" ? [ExternalScopes.MediaRead] : [],
		advertisedScopes: () => [ExternalScopes.MediaRead],
		handler,
	});
	const translationStore = createTranslationStore({
		defaultLocale: "en",
		bundles: {},
	});
	const base = await fixture.getConfig();
	const context = createServiceContext({
		config: {
			...base,
			ai: {
				...base.ai,
				mcp: { enabled: true, tools: [tool], skills: [] },
			},
		},
		database: await fixture.getDatabase(),
		translationStore,
	});
	let scopes: ExternalScope[] = [ExternalScopes.McpAccess];
	const app = new Hono<LucidHonoGeneric>();
	app.onError((error, c) => {
		if (error instanceof LucidAPIError && error.error.status === 403)
			return c.text(error.message, 403);
		throw error;
	});
	app.post("/lucid/mcp", (c) => {
		const authority = { principal: { type: "system" as const }, scopes };
		c.set("externalAuth", {
			...authority,
			credential: { type: "oauth", grantId: 1, clientId: "test" },
		});
		c.set("config", context.config);
		c.set("runtimeContext", {
			runtime: "test",
			compiled: false,
			configEntryPoint: null,
			getConnectionInfo: () => ({}),
		});
		c.set("translationStore", translationStore);
		return handleMcpRequest({
			request: c.req.raw,
			context,
			authority,
			requireScopes: (required) =>
				externalScopeCheck(c, required, { resource: "mcp" }),
		});
	});
	const call = () =>
		app.request("http://localhost/lucid/mcp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
				"mcp-protocol-version": "2026-07-28",
				"mcp-method": "tools/call",
				"mcp-name": tool.name,
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: {
					name: tool.name,
					arguments: { resource: " media " },
					_meta: {
						[PROTOCOL_VERSION_META_KEY]: "2026-07-28",
						[CLIENT_INFO_META_KEY]: { name: "test", version: "1" },
						[CLIENT_CAPABILITIES_META_KEY]: {},
					},
				},
			}),
		});
	const denied = await call();
	expect(denied.status).toBe(403);
	expect(denied.headers.get("WWW-Authenticate")).toContain(
		'error="insufficient_scope"',
	);
	expect(denied.headers.get("WWW-Authenticate")).toContain(
		'scope="mcp:access media:read"',
	);
	expect(handler).not.toHaveBeenCalled();
	scopes = [...scopes, ExternalScopes.MediaRead];
	const allowed = await call();
	expect(allowed.status).toBe(200);
	expect(await allowed.json()).toMatchObject({
		result: { structuredContent: { ok: true } },
	});
	expect(handler).toHaveBeenCalledOnce();
});

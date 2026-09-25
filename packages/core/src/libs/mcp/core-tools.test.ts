import {
	CLIENT_CAPABILITIES_META_KEY,
	CLIENT_INFO_META_KEY,
	PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { afterAll, assert, beforeAll, expect, test, vi } from "vitest";
import z from "zod";
import syncCollections from "../../services/sync/sync-collections.js";
import syncLocales from "../../services/sync/sync-locales.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import applyCollectionMigrations from "../collection/apply-collection-migrations.js";
import BrickBuilder from "../collection/builders/brick-builder/index.js";
import CollectionBuilder from "../collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../collection/plan-collection-migrations.js";
import coreToolDefinitions from "../config/core-tool-definitions.js";
import { createTranslationStore } from "../i18n/index.js";
import { getCollectionPermission } from "../permission/collection-permissions.js";
import { ExternalScopes } from "../permission/external-scopes.js";
import createToolkit from "../toolkit/create-toolkit.js";
import { executeAgentTool } from "../tools/execute-tool.js";
import type { McpToolAuthority } from "../tools/types.js";
import { createHandler } from "./create-handler.js";

const fixture = getTestConfig();
const generationContext = vi.fn(() => [
	{ type: "text" as const, label: "dynamic", value: "unused" },
]);
const pages = new CollectionBuilder("mcp_pages", {
	mode: "multiple",
	localized: true,
	routing: { field: "fullSlug" },
	details: { labels: { singular: "Page", plural: "Pages" } },
	bricks: {
		builder: [new BrickBuilder("hero").addText("heading", { localized: true })],
	},
})
	.addText("title", {
		localized: true,
		useAsLabel: true,
		ai: { context: generationContext },
	})
	.addNumber("rank")
	.addText("fullSlug", { localized: false })
	.addJSON("settings", { localized: false })
	.addRepeater("links")
	.addText("caption", {
		localized: false,
	})
	.endRepeater();
const restricted = new CollectionBuilder("mcp_restricted", {
	mode: "multiple",
	details: { labels: { singular: "Restricted", plural: "Restricted" } },
}).addText("title");
let context: ServiceContext;
let aboutId: number;
let contactId: number;
const authority: McpToolAuthority = {
	principal: { type: "system" },
	scopes: [
		ExternalScopes.McpAccess,
		ExternalScopes.DocumentRead(pages.key),
		ExternalScopes.LocalesRead,
		ExternalScopes.MediaRead,
	],
};

const post = (method: string, params: Record<string, unknown>) =>
	new Request("https://cms.example.test/lucid/mcp", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			"mcp-protocol-version": "2026-07-28",
			"mcp-method": method,
			...(typeof params.name === "string" ? { "mcp-name": params.name } : {}),
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method,
			params: {
				...params,
				_meta: {
					[PROTOCOL_VERSION_META_KEY]: "2026-07-28",
					[CLIENT_INFO_META_KEY]: { name: "core-tools-test", version: "1" },
					[CLIENT_CAPABILITIES_META_KEY]: {},
				},
			},
		}),
	});

const resultSchema = z.object({
	result: z.object({
		isError: z.boolean().optional(),
		structuredContent: z.record(z.string(), z.unknown()).optional(),
		content: z.array(z.object({ type: z.string() }).passthrough()),
	}),
});

const call = async (name: string, input: Record<string, unknown>) => {
	const handler = createHandler({ context, authority });
	const response = await handler.fetch(
		post("tools/call", { name, arguments: input }),
	);
	expect(response.status).toBe(200);
	const body: unknown = await response.json();
	const parsed = resultSchema.safeParse(body);
	assert(parsed.success, JSON.stringify(body));
	return parsed.data.result;
};

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			host: "https://cms.example.test",
			collections: [pages, restricted],
			ai: {
				...config.ai,
				tools: { definitions: coreToolDefinitions, disabled: [] },
			},
			localization: {
				defaultLocale: "en",
				locales: [
					{ code: "en", label: "English" },
					{ code: "fr", label: "French" },
				],
			},
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();
	expect((await syncCollections(context)).error).toBeUndefined();
	const plan = await planCollectionMigrations(context);
	assert(plan.data, JSON.stringify(plan.error));
	expect(
		(await applyCollectionMigrations(context, plan.data)).error,
	).toBeUndefined();
	const toolkit = createToolkit(context);
	for (const [title, fullSlug, caption, heading] of [
		["About", "/about", "Team", "About heading"],
		["Contact", "/contact", "Email", "Contact heading"],
	]) {
		const created = await toolkit.documents.createSingle({
			collectionKey: pages.key,
			actor: { kind: "system" },
			data: {
				fields: {
					title: { en: title, fr: `FR ${title}` },
					fullSlug,
					settings: { en: "keep-en", fr: "keep-fr" },
					links: [{ fields: { caption } }],
				},
				bricks: {
					builder: [
						{
							key: "hero",
							fields: { heading: { en: heading, fr: `FR ${heading}` } },
						},
					],
				},
			},
		});
		assert(created.data, JSON.stringify(created.error));
		if (fullSlug === "/about") aboutId = created.data.id;
		if (fullSlug === "/contact") contactId = created.data.id;
	}
});

afterAll(() => fixture.destroy());

test("MCP advertises usable schemas for the enabled read-only tools", async () => {
	const response = await createHandler({ context, authority }).fetch(
		post("tools/list", {}),
	);
	expect(response.status).toBe(200);
	const body: unknown = await response.json();
	const listed = z
		.object({
			result: z.object({
				tools: z.array(
					z.object({
						name: z.string(),
						inputSchema: z.object({ type: z.literal("object") }).passthrough(),
						annotations: z.object({ readOnlyHint: z.literal(true) }),
					}),
				),
			}),
		})
		.parse(body);
	expect(listed.result.tools.map((tool) => tool.name)).toEqual(
		expect.arrayContaining([
			"collections_list",
			"collections_describe",
			"documents_find",
			"documents_get",
		]),
	);
	const mediaFind = listed.result.tools.find(
		(tool) => tool.name === "media_find",
	);
	expect(JSON.stringify(mediaFind?.inputSchema)).toContain('"starts-with"');
});

test("MCP discovery describes routing and excludes inaccessible collections", async () => {
	const listed = await call("collections_list", {});
	expect(listed.isError).not.toBe(true);
	expect(JSON.stringify(listed.structuredContent)).toContain(pages.key);
	expect(JSON.stringify(listed.structuredContent)).not.toContain(
		restricted.key,
	);
	const described = await call("collections_describe", {
		collectionKey: pages.key,
	});
	expect(described.isError).not.toBe(true);
	expect(described.structuredContent).toMatchObject({
		meta: {
			collection: {
				routing: { field: "fullSlug" },
			},
		},
	});
	expect(generationContext).not.toHaveBeenCalled();
	const locales = await call("locales_list", {});
	expect(locales.structuredContent).toMatchObject({
		data: expect.arrayContaining([
			expect.objectContaining({ purpose: "content", code: "fr" }),
			expect.objectContaining({ purpose: "interface", code: "en" }),
		]),
		meta: { content: { defaultLocale: "en" } },
	});
});

test("MCP document reads use real custom-field, brick and repeater filters", async () => {
	for (const filter of [
		{ _fullSlug: { value: "/about" } },
		{ hero: { _heading: { value: "About heading" } } },
		{ fields: { links: { _caption: { value: "Team" } } } },
	]) {
		const result = await call("documents_find", {
			collectionKey: pages.key,
			query: { filter },
		});
		expect(result.isError).not.toBe(true);
		const data = z
			.object({ data: z.array(z.object({ id: z.number() })) })
			.parse(result.structuredContent);
		expect(data.data.map((item) => item.id)).toEqual([aboutId]);
	}
	const document = await call("documents_get", {
		collectionKey: pages.key,
		id: aboutId,
		contentLocale: "fr",
	});
	expect(document.isError).not.toBe(true);
	expect(JSON.stringify(document.structuredContent)).toContain("FR About");
	expect(JSON.stringify(document.structuredContent)).toContain(
		'"settings":{"en":"keep-en","fr":"keep-fr"}',
	);
	expect(JSON.stringify(document.structuredContent)).toContain(
		`https://cms.example.test/lucid/collections/${pages.key}/latest/${aboutId}`,
	);
	const denied = await call("documents_get", {
		collectionKey: restricted.key,
		id: aboutId,
	});
	expect(denied.isError).toBe(true);
});

test("MCP document reads respect pagination, field selection and content locales", async () => {
	const first = await call("documents_find", {
		collectionKey: pages.key,
		query: { page: 1, perPage: 1 },
	});
	expect(first.structuredContent).toMatchObject({
		pagination: { page: 1, perPage: 1, count: 2, nextPage: 2 },
	});
	const second = await call("documents_find", {
		collectionKey: pages.key,
		query: { page: 2, perPage: 1 },
	});
	expect(second.structuredContent).toMatchObject({
		pagination: { nextPage: null },
	});
	const selected = await call("documents_get", {
		collectionKey: pages.key,
		id: aboutId,
		fieldKeys: ["fullSlug"],
	});
	expect(selected.structuredContent).toMatchObject({
		data: { fields: { fullSlug: "/about" } },
	});
	const selectedData = z
		.object({
			data: z.object({ fields: z.record(z.string(), z.unknown()) }),
		})
		.parse(selected.structuredContent);
	expect(Object.keys(selectedData.data.fields)).toEqual(["fullSlug"]);
	const invalidLocale = await call("documents_get", {
		collectionKey: pages.key,
		id: aboutId,
		contentLocale: "unknown",
	});
	expect(invalidLocale.isError).toBe(true);
});

test("MCP document filters preserve content API operators and nested OR groups", async () => {
	for (const filter of [
		{ _fullSlug: { operator: "contains", value: "bout" } },
		{ _fullSlug: { operator: "starts-with", value: "/abo" } },
		{ _fullSlug: { operator: "!=", value: "/contact" } },
		{ _fullSlug: { operator: "in", value: ["/about"] } },
	]) {
		const result = await call("documents_find", {
			collectionKey: pages.key,
			query: { filter },
		});
		expect(result.isError).not.toBe(true);
		const parsed = z
			.object({ data: z.array(z.object({ id: z.number() })) })
			.parse(result.structuredContent);
		expect(parsed.data.map((item) => item.id)).toEqual([aboutId]);
	}

	const orResult = await call("documents_find", {
		collectionKey: pages.key,
		query: {
			filter: [
				{ hero: { _heading: { operator: "contains", value: "About" } } },
				{
					fields: {
						links: { _caption: { operator: "starts-with", value: "Email" } },
					},
				},
			],
		},
	});
	expect(orResult.isError).not.toBe(true);
	const parsed = z
		.object({ data: z.array(z.object({ id: z.number() })) })
		.parse(orResult.structuredContent);
	expect(parsed.data.map((item) => item.id).sort((a, b) => a - b)).toEqual(
		[aboutId, contactId].sort((a, b) => a - b),
	);
});

test("agent content tools share the read services but enforce collection permissions", async () => {
	const execution = {
		authority: {
			userId: 1,
			superAdmin: false,
			permissions: [getCollectionPermission(pages.key, "read")],
		},
		signal: AbortSignal.timeout(5000),
		operationId: "test:read",
	};
	const listed = await executeAgentTool({
		context,
		name: "collections_list",
		input: {},
		execution,
	});
	expect(listed.type).toBe("success");
	expect(JSON.stringify(listed)).toContain(pages.key);
	expect(JSON.stringify(listed)).not.toContain(restricted.key);
	const document = await executeAgentTool({
		context,
		name: "documents_get",
		input: { collectionKey: pages.key, id: aboutId },
		execution,
	});
	expect(document).toMatchObject({
		type: "success",
		data: { output: { data: { id: aboutId, collectionKey: pages.key } } },
	});
	expect(
		await executeAgentTool({
			context,
			name: "documents_get",
			input: { collectionKey: restricted.key, id: aboutId },
			execution,
		}),
	).toEqual({ type: "forbidden" });
	expect(
		await executeAgentTool({
			context,
			name: "collections_describe",
			input: { collectionKey: restricted.key },
			execution,
		}),
	).toEqual({ type: "forbidden" });
});

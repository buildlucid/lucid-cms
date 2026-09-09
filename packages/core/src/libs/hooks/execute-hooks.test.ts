import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { InternalCollectionDocument } from "../../exports/types.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { copy, createTranslationStore } from "../i18n/index.js";
import defineHook from "./define-hook.js";
import executeHooks from "./execute-hooks.js";
import type { HookPayload, LucidHookDocuments } from "./types.js";

const collection = new CollectionBuilder("pages", {
	mode: "multiple",
	details: { labels: { singular: "Page", plural: "Pages" } },
});
const meta = {
	collection,
	collectionKey: collection.key,
	collectionTableNames: {
		version: "lucid_document__pages__ver",
		document: "lucid_document__pages",
		documentFields: "lucid_document__pages__fields",
	},
} satisfies HookPayload<"documents", "afterFetch">["meta"];

describe("execute hooks", () => {
	const fixture = getTestConfig();
	let context: ServiceContext;

	beforeAll(async () => {
		context = createServiceContext({
			config: await fixture.getConfig(),
			database: await fixture.getDatabase(),
			translationStore: createTranslationStore({
				defaultLocale: "en",
				bundles: {},
			}),
		});
	});
	afterAll(() => fixture.destroy());

	it("runs ordered transforms with drafts and replacement data", async () => {
		const document: InternalCollectionDocument = {
			id: 1,
			collectionKey: "pages",
			version: "snapshot",
			versionId: 2,
			route: null,
			versions: {},
			isDeleted: false,
			createdBy: null,
			createdAt: null,
			updatedAt: null,
			updatedBy: null,
			fields: [],
		};
		const order: string[] = [];
		const defaultHook = vi.fn<LucidHookDocuments<"afterFetch">["handler"]>(
			async ({ context: hookContext, toolkit, data, meta: hookMeta }) => {
				expect(hookContext).toBe(context);
				expect(hookMeta).toBe(meta);
				expect(toolkit.documents.getMultiple).toBeTypeOf("function");
				order.push("default");
				data.documents[0]?.fields?.push({
					key: "default",
					type: "text",
					value: "Default",
				});
				return { error: undefined, data: undefined };
			},
		);
		const earlyHook = defineHook({
			service: "documents",
			event: "afterFetch",
			order: -10,
			handler: async ({ data }) => {
				order.push("early");
				data.documents[0]?.fields?.push({
					key: "early",
					type: "text",
					value: "Early",
				});
				return { error: undefined, data: undefined };
			},
		});
		const lateHook = defineHook({
			service: "documents",
			event: "afterFetch",
			order: 10,
			handler: async ({ data }) => {
				order.push("late");
				return {
					error: undefined,
					data: {
						...data,
						documents: data.documents.map((document) => ({
							...document,
							fields: [
								...(document.fields ?? []).map((field) => ({ ...field })),
								{ key: "late", type: "text" as const, value: "Late" },
							],
						})),
					},
				};
			},
		});
		collection.config.hooks = [earlyHook];

		const response = await executeHooks(
			context,
			{
				service: "documents",
				event: "afterFetch",
				config: {
					...context.config,
					hooks: [
						{ service: "documents", event: "afterFetch", handler: defaultHook },
						lateHook,
					],
				},
				collectionInstance: collection,
			},
			{
				meta,
				data: {
					versionType: "snapshot",
					relationVersionType: "staging",
					documents: [document],
				},
			},
		);

		expect(response.error).toBeUndefined();
		expect(order).toEqual(["early", "default", "late"]);
		expect(response.data?.documents[0]?.fields).toEqual([
			{ key: "early", type: "text", value: "Early" },
			{ key: "default", type: "text", value: "Default" },
			{ key: "late", type: "text", value: "Late" },
		]);
		expect(document.fields).toEqual([]);
	});

	it("runs effect hooks by order with one shared toolkit and payload", async () => {
		const payload = { meta, data: { ids: [1] } };
		const order: string[] = [];
		const globalHook = vi.fn<LucidHookDocuments<"afterRestore">["handler"]>(
			async () => {
				order.push("global");
				return { error: undefined, data: undefined };
			},
		);
		const collectionHook = vi.fn<LucidHookDocuments<"afterRestore">["handler"]>(
			async () => {
				order.push("collection");
				return { error: undefined, data: undefined };
			},
		);
		const ignoredHook = vi.fn(async () => ({
			error: undefined,
			data: undefined,
		}));
		collection.config.hooks = [
			{
				service: "documents",
				event: "afterRestore",
				order: -10,
				handler: collectionHook,
			},
			{ service: "documents", event: "beforeDelete", handler: ignoredHook },
		];

		const response = await executeHooks(
			context,
			{
				service: "documents",
				event: "afterRestore",
				config: {
					...context.config,
					hooks: [
						{
							service: "documents",
							event: "afterRestore",
							handler: globalHook,
						},
						{ service: "media", event: "afterRestore", handler: ignoredHook },
					],
				},
				collectionInstance: collection,
			},
			payload,
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toBeUndefined();
		expect(order).toEqual(["collection", "global"]);
		expect(ignoredHook).not.toHaveBeenCalled();
		const args = globalHook.mock.calls[0]?.[0];
		expect(args?.context).toBe(context);
		expect(args?.data).toBe(payload.data);
		expect(args?.meta).toBe(payload.meta);
		expect(args?.toolkit.documents.getMultiple).toBeTypeOf("function");
		expect(collectionHook.mock.calls[0]?.[0]).toBe(args);
	});

	it("stops when a hook returns an error", async () => {
		const error = {
			type: "basic" as const,
			message: copy.literal("Test hook failure"),
		};
		const nextHook = vi.fn(async () => ({ error: undefined, data: undefined }));
		const response = await executeHooks(
			context,
			{
				service: "media",
				event: "afterRestore",
				config: {
					...context.config,
					hooks: [
						{
							service: "media",
							event: "afterRestore",
							handler: async () => ({ error, data: undefined }),
						},
						{ service: "media", event: "afterRestore", handler: nextHook },
					],
				},
			},
			{ meta: {}, data: { ids: [1] } },
		);

		expect(response.error).toBe(error);
		expect(nextHook).not.toHaveBeenCalled();
	});

	it("returns the original data when no transform hooks match", async () => {
		const payload: HookPayload<"documents", "afterFetch"> = {
			meta,
			data: {
				versionType: "latest",
				relationVersionType: "latest",
				documents: [],
			},
		};
		const response = await executeHooks(
			context,
			{ service: "documents", event: "afterFetch", config: context.config },
			payload,
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toBe(payload.data);
	});
});

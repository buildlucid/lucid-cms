import { describe, expect, it, vi } from "vitest";
import type { InternalCollectionDocument } from "../../types.js";
import executeHooks from "./execute-hooks.js";

describe("execute hooks", () => {
	it("runs transform hooks sequentially with Immer drafts and priority order", async () => {
		const document = {
			id: 1,
			collectionKey: "pages",
			fields: [],
		} as unknown as InternalCollectionDocument;
		const context = {} as never;
		const order: string[] = [];

		const defaultHook = vi.fn(async (_context, payload) => {
			order.push("default");
			payload.data.documents[0]?.fields?.push({
				key: "default",
				type: "text",
				value: "Default",
			});

			return {
				error: undefined,
				data: undefined,
			};
		});
		const earlyHook = vi.fn(async (_context, payload) => {
			order.push("early");
			payload.data.documents[0]?.fields?.push({
				key: "early",
				type: "text",
				value: "Early",
			});

			return {
				error: undefined,
				data: undefined,
			};
		});
		const lateHook = vi.fn(async (_context, payload) => {
			order.push("late");

			return {
				error: undefined,
				data: {
					...payload.data,
					// @ts-expect-error
					documents: payload.data.documents.map((document) => ({
						...document,
						fields: [
							// @ts-expect-error
							...(document.fields ?? []).map((field) => ({ ...field })),
							{
								key: "late",
								type: "text",
								value: "Late",
							},
						],
					})),
				},
			};
		});

		const response = await executeHooks(
			context,
			{
				service: "documents",
				event: "afterFetch",
				config: {
					hooks: [
						{
							service: "documents",
							event: "afterFetch",
							handler: defaultHook,
						},
						{
							service: "documents",
							event: "afterFetch",
							priority: 10,
							handler: lateHook,
						},
					],
				} as never,
				collectionInstance: {
					config: {
						hooks: [
							{
								service: "documents",
								event: "afterFetch",
								priority: -10,
								handler: earlyHook,
							},
						],
					},
				} as never,
			},
			{
				meta: {
					collection: {} as never,
					collectionKey: "pages",
					collectionTableNames: {} as never,
				},
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
	});

	it("runs effect hooks sequentially without returning transformed data", async () => {
		const context = {} as never;
		const payload = {
			meta: {
				collection: {} as never,
				collectionKey: "pages",
				userId: 1,
				collectionTableNames: {} as never,
			},
			data: {
				documentId: 1,
				versionId: 2,
				versionType: "latest" as const,
				bricks: [],
				fields: [],
			},
		};
		const order: string[] = [];
		const globalHook = vi.fn(async (_context, _data) => {
			order.push("global");

			return {
				error: undefined,
				data: undefined,
			};
		});
		const collectionHook = vi.fn(async (_context, _data) => {
			order.push("collection");

			return {
				error: undefined,
				data: undefined,
			};
		});

		const response = await executeHooks(
			context,
			{
				service: "documents",
				event: "afterUpsert",
				config: {
					hooks: [
						{
							service: "documents",
							event: "afterUpsert",
							handler: globalHook,
						},
					],
				} as never,
				collectionInstance: {
					config: {
						hooks: [
							{
								service: "documents",
								event: "afterUpsert",
								handler: collectionHook,
							},
						],
					},
				} as never,
			},
			payload,
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toBeUndefined();
		expect(order).toEqual(["global", "collection"]);
		expect(globalHook).toHaveBeenCalledWith(context, payload);
		expect(collectionHook).toHaveBeenCalledWith(context, payload);
	});

	it("matches collection hooks by service and event", async () => {
		const context = {} as never;
		const payload = {
			meta: {
				collection: {} as never,
				collectionKey: "pages",
			},
			data: {
				operationId: 1,
				collectionKey: "pages",
				documentId: 2,
				target: "staging",
				event: {
					id: 3,
					type: "created" as const,
					userId: 4,
					comment: null,
					metadata: {},
					createdAt: new Date().toISOString(),
				},
			},
		};
		const order: string[] = [];
		const globalHook = vi.fn(async (_context, _payload) => {
			order.push("global");

			return {
				error: undefined,
				data: undefined,
			};
		});
		const collectionHook = vi.fn(async (_context, _payload) => {
			order.push("collection");

			return {
				error: undefined,
				data: undefined,
			};
		});
		const ignoredHook = vi.fn(async () => {
			order.push("ignored");

			return {
				error: undefined,
				data: undefined,
			};
		});

		const response = await executeHooks(
			context,
			{
				service: "publishOperations",
				event: "afterEvent",
				config: {
					hooks: [
						{
							service: "publishOperations",
							event: "afterEvent",
							handler: globalHook,
						},
					],
				} as never,
				collectionInstance: {
					config: {
						hooks: [
							{
								service: "documents",
								event: "afterEvent",
								handler: ignoredHook,
							},
							{
								service: "publishOperations",
								event: "afterEvent",
								handler: collectionHook,
							},
						],
					},
				} as never,
			},
			payload,
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toBeUndefined();
		expect(order).toEqual(["global", "collection"]);
		expect(ignoredHook).not.toHaveBeenCalled();
	});
});

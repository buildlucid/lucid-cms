import { describe, expect, it, vi } from "vitest";
import type { InternalCollectionDocument } from "../../types.js";
import executeHooks from "./execute-hooks.js";

describe("execute hooks", () => {
	it("merges matching global and collection hook responses by default", async () => {
		const context = {} as never;

		const globalHook = vi.fn(async () => ({
			error: undefined,
			data: {
				fields: [{ key: "title", type: "text", value: "Title" }],
			},
		}));
		const collectionHook = vi.fn(async () => ({
			error: undefined,
			data: {
				bricks: [{ key: "content" }],
			},
		}));

		const response = await executeHooks(
			{
				service: "documents",
				event: "beforeUpsert",
				config: {
					hooks: [
						{
							service: "documents",
							event: "beforeUpsert",
							handler: globalHook,
						},
					],
				} as never,
				collectionInstance: {
					config: {
						hooks: [
							{
								event: "beforeUpsert",
								handler: collectionHook,
							},
						],
					},
				} as never,
			},
			context,
			{
				meta: {
					collection: {} as never,
					collectionKey: "pages",
					userId: 1,
					collectionTableNames: {} as never,
				},
				data: {
					documentId: 1,
					versionId: 2,
					versionType: "latest",
				},
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toEqual({
			fields: [{ key: "title", type: "text", value: "Title" }],
			bricks: [{ key: "content" }],
		});
	});

	it("passes transformed data between matching pipeline hooks", async () => {
		const document = {
			id: 1,
			collectionKey: "pages",
			fields: [],
		} as unknown as InternalCollectionDocument;
		const context = {} as never;

		const globalHook = vi.fn(async (_context, payload) => ({
			error: undefined,
			// @ts-expect-error
			data: payload.data.documents.map((document) => ({
				...document,
				fields: [{ key: "title", type: "text", value: "Title" }],
			})),
		}));
		const collectionHook = vi.fn(async (_context, payload) => ({
			error: undefined,
			// @ts-expect-error
			data: payload.data.documents.map((document) => ({
				...document,
				fields: [
					...(document.fields ?? []),
					{ key: "slug", type: "text", value: "/title" },
				],
			})),
		}));

		const response = await executeHooks(
			{
				service: "documents",
				event: "afterFetch",
				config: {
					hooks: [
						{
							service: "documents",
							event: "afterFetch",
							handler: globalHook,
						},
					],
				} as never,
				collectionInstance: {
					config: {
						hooks: [
							{
								event: "afterFetch",
								handler: collectionHook,
							},
						],
					},
				} as never,
			},
			{
				initialData: [document],
				buildArgs: (currentDocuments) => [
					context,
					{
						meta: {
							collection: {} as never,
							collectionKey: "pages",
							collectionTableNames: {} as never,
						},
						data: {
							versionType: "snapshot",
							relationVersionType: "staging",
							documents: currentDocuments,
						},
					},
				],
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data?.[0]?.fields).toEqual([
			{ key: "title", type: "text", value: "Title" },
			{ key: "slug", type: "text", value: "/title" },
		]);
		expect(collectionHook).toHaveBeenCalledWith(
			context,
			expect.objectContaining({
				data: expect.objectContaining({
					documents: [
						expect.objectContaining({
							fields: [{ key: "title", type: "text", value: "Title" }],
						}),
					],
				}),
			}),
		);
	});
});

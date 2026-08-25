import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getDocumentFieldsTableSchema: vi.fn(),
	getDocumentVersionTableSchema: vi.fn(),
	primeRuntimeSchemas: vi.fn(),
	selectMultipleUnion: vi.fn(),
}));

vi.mock("../../libs/repositories/index.js", () => ({
	DocumentVersionsRepository: class {
		selectMultipleUnion = mocks.selectMultipleUnion;
	},
}));

vi.mock(
	"../../libs/collection/schema/runtime/prime-runtime-schemas.js",
	() => ({
		default: mocks.primeRuntimeSchemas,
	}),
);

vi.mock(
	"../../libs/collection/schema/runtime/runtime-schema-selectors.js",
	() => ({
		getDocumentFieldsTableSchema: mocks.getDocumentFieldsTableSchema,
		getDocumentVersionTableSchema: mocks.getDocumentVersionTableSchema,
	}),
);

import getDocumentRefs from "./get-refs.js";

const context = {
	db: {},
	config: {
		db: {},
		collections: [{ key: "pages" }, { key: "blog" }],
	},
} as never;

describe("document ref fetching", () => {
	beforeEach(() => {
		mocks.getDocumentVersionTableSchema.mockImplementation(
			(_context, collectionKey: string) =>
				Promise.resolve({
					error: undefined,
					data: {
						name: `lucid_document__${collectionKey}__ver`,
					},
				}),
		);
		mocks.getDocumentFieldsTableSchema.mockImplementation(
			(_context, collectionKey: string) =>
				Promise.resolve({
					error: undefined,
					data: {
						name: `lucid_document__${collectionKey}__fields`,
						columns: [],
					},
				}),
		);
		mocks.primeRuntimeSchemas.mockResolvedValue({
			error: undefined,
			data: undefined,
		});
		mocks.selectMultipleUnion.mockResolvedValue({
			error: undefined,
			data: [],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("supports per-related-collection version types", async () => {
		const response = await getDocumentRefs(context, {
			targets: new Map([
				["lucid_document__pages", new Set([1, "not-a-document-id"])],
				["lucid_document__blog", new Set([2])],
				["lucid_media", new Set([3])],
			]),
			versionType: "latest",
			resolveVersionType: ({ collectionKey }) =>
				collectionKey === "blog" ? "signed-off" : "staging",
		});

		expect(response.error).toBeUndefined();
		expect(mocks.primeRuntimeSchemas).toHaveBeenCalledWith(context, {
			collectionKeys: ["pages", "blog"],
		});
		expect(mocks.selectMultipleUnion).toHaveBeenCalledTimes(1);
		expect(mocks.selectMultipleUnion).toHaveBeenCalledWith({
			unions: expect.arrayContaining([
				expect.objectContaining({
					collectionKey: "pages",
					ids: [1],
					versionType: "staging",
				}),
				expect.objectContaining({
					collectionKey: "blog",
					ids: [2],
					versionType: "signed-off",
				}),
			]),
			versionType: "latest",
			validation: {
				enabled: true,
			},
		});
	});

	it("returns no hydrated ref when the requested target version is missing", async () => {
		const response = await getDocumentRefs(context, {
			targets: new Map([["lucid_document__pages", new Set([1])]]),
			versionType: "staging",
		});

		expect(response.error).toBeUndefined();
		expect(response.data?.rows).toEqual([]);
		expect(mocks.selectMultipleUnion).toHaveBeenCalledTimes(1);
		expect(mocks.selectMultipleUnion).toHaveBeenCalledWith({
			unions: [
				expect.objectContaining({
					collectionKey: "pages",
					ids: [1],
					versionType: "staging",
				}),
			],
			versionType: "staging",
			validation: {
				enabled: true,
			},
		});
	});
});

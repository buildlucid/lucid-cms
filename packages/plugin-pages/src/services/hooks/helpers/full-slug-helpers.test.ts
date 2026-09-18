import { CollectionBuilder } from "@lucidcms/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollectionConfig } from "../../../types/types.js";

const mocks = vi.hoisted(() => ({
	getParentFields: vi.fn(),
	getDescendantFields: vi.fn(),
}));

vi.mock("../../get-parent-fields.js", () => ({
	default: mocks.getParentFields,
}));

vi.mock("../../get-descendant-fields.js", () => ({
	default: mocks.getDescendantFields,
}));

import buildDescendantFullSlugs from "./build-descendant-full-slugs.js";
import resolveParentFullSlug from "./resolve-parent-full-slug.js";

const context = {
	config: {
		localization: {
			defaultLocale: "en",
			locales: [{ code: "en" }],
		},
	},
} as never;
const collection = {
	key: "pages",
	localized: false,
	segments: [],
	ui: {
		placement: { at: "end" },
		widths: {
			slug: 6,
			parentPage: 12,
			segments: 12,
		},
	},
	unique: true,
} satisfies CollectionConfig;
const collectionInstance = new CollectionBuilder("pages", {
	mode: "multiple",
	details: {
		labels: {
			singular: "Page",
			plural: "Pages",
		},
	},
});

describe("page full-slug helpers", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("resolves a parent and constructs the document full slug", async () => {
		mocks.getParentFields.mockResolvedValueOnce({
			error: undefined,
			data: [
				{
					_slug: "parent",
					_fullSlug: "/parent",
					_parentPage: null,
					document_id: 1,
					locale: null,
				},
			],
		});

		const response = await resolveParentFullSlug(context, {
			collection,
			collectionInstance,
			collectionKey: "pages",
			versionType: "latest",
			tables: {} as never,
			fields: {
				slug: { key: "slug", type: "text", value: "child" },
				parentPage: {
					key: "parentPage",
					type: "relation",
					value: [{ id: 1, collectionKey: "pages" }],
				},
				all: [],
			},
		});

		expect(response.error).toBeUndefined();
		expect(response.data).toEqual(new Map([[null, "/parent/child"]]));
	});

	it("constructs descendant full slugs from the shared query result", async () => {
		mocks.getDescendantFields.mockResolvedValueOnce({
			error: undefined,
			data: [
				{
					document_id: 2,
					document_version_id: 22,
					rows: [
						{
							locale: null,
							_slug: "child",
							_fullSlug: "/child",
							_parentPage: 1,
						},
					],
				},
			],
		});

		const response = await buildDescendantFullSlugs(context, {
			documentIds: [1],
			versionType: "latest",
			collectionKey: "pages",
			tables: {} as never,
			collection,
			collectionInstance,
			parentFullSlugField: {
				key: "fullSlug",
				type: "text",
				value: "/parent",
			},
		});

		expect(response.error).toBeUndefined();
		expect(response.data).toEqual([
			{
				documentId: 2,
				versionId: 22,
				fullSlugs: new Map([[null, "/parent/child"]]),
			},
		]);
	});
});

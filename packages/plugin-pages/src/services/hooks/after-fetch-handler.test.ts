import type { InternalCollectionDocument } from "@lucidcms/core/types";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getParentFields: vi.fn(),
}));

vi.mock("../get-parent-fields.js", () => ({
	default: mocks.getParentFields,
}));

import afterFetchHandler from "./after-fetch-handler.js";

const context = {
	config: {
		i18n: {
			content: {
				defaultLocale: "en",
				locales: [{ code: "en" }],
			},
		},
	},
} as never;

const options = {
	collections: [
		{
			collectionKey: "pages",
			localized: false,
			displayFullSlug: true,
		},
	],
};

const createDocument = (props: {
	id: number;
	slug: string;
	parentId: number;
	fullSlug: string;
}): InternalCollectionDocument =>
	({
		id: props.id,
		collectionKey: "pages",
		status: "snapshot",
		versionId: props.id + 20,
		fields: [
			{
				key: "slug",
				type: "text",
				value: props.slug,
			},
			{
				key: "parentPage",
				type: "document",
				value: [{ id: props.parentId, collectionKey: "pages" }],
			},
			{
				key: "fullSlug",
				type: "text",
				value: props.fullSlug,
			},
		],
	}) as InternalCollectionDocument;

const createHookPayload = (
	documents: InternalCollectionDocument[],
	versionType = "snapshot",
) => ({
	meta: {
		collection: {} as never,
		collectionKey: "pages",
		collectionTableNames: {} as never,
	},
	data: {
		versionType,
		relationVersionType: "staging",
		documents,
	},
});

describe("pages afterFetch hook", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("derives snapshot fullSlugs in order using the publish target parent version", async () => {
		mocks.getParentFields
			.mockResolvedValueOnce({
				error: undefined,
				data: [
					{
						_slug: "x",
						_fullSlug: "/x",
						_parentPage: null,
						document_id: 1,
						locale: "en",
					},
				],
			})
			.mockResolvedValueOnce({
				error: undefined,
				data: [],
			});

		const payload = createHookPayload([
			createDocument({
				id: 2,
				slug: "Y",
				parentId: 1,
				fullSlug: "/x/y",
			}),
			createDocument({
				id: 3,
				slug: "Z",
				parentId: 4,
				fullSlug: "/missing/z",
			}),
		]);
		const response = await afterFetchHandler(options)(context, payload);

		expect(response.error).toBeUndefined();
		expect(response.data).toBeUndefined();
		expect(payload.data.documents[0]?.fields?.[2]?.value).toBe("/x/y");
		expect(payload.data.documents[1]?.fields?.[2]?.value).toBe("/z");
		expect(mocks.getParentFields).toHaveBeenNthCalledWith(
			1,
			context,
			expect.objectContaining({
				versionType: "staging",
				missingParentIsEmpty: true,
			}),
		);
	});

	it("does not derive fullSlugs for non-snapshot versions", async () => {
		const response = await afterFetchHandler(options)(
			context,
			createHookPayload(
				[
					createDocument({
						id: 2,
						slug: "Y",
						parentId: 1,
						fullSlug: "/x/y",
					}),
				],
				"latest",
			),
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toBeUndefined();
		expect(mocks.getParentFields).not.toHaveBeenCalled();
	});
});

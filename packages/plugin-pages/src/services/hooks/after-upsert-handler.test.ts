import { CollectionBuilder } from "@lucidcms/core";
import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	propagateRouteSegmentUpdates: vi.fn(),
}));

vi.mock("./helpers/propagate-route-segment-updates.js", () => ({
	default: mocks.propagateRouteSegmentUpdates,
}));

import afterUpsertHandler from "./after-upsert-handler.js";

const routeGroup = new CollectionBuilder("route-group", {
	mode: "multiple",
	details: { name: "Route groups", singularName: "Route group" },
}).addText("route_key");

describe("pages afterUpsert hook", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	test("propagates changes from collections used as route segments", async () => {
		mocks.propagateRouteSegmentUpdates.mockResolvedValue({
			error: undefined,
			data: undefined,
		});
		const context = {} as never;
		const options = {
			collections: [
				{
					key: "route-page",
					localized: false,
					segments: [
						{
							relation: "route_group",
							collection: "route-group",
							field: "route_key",
						},
					],
					ui: {
						fullSlug: true,
						widths: {
							fullSlug: 6,
							slug: 6,
							parentPage: 12,
							segments: 12,
						},
					},
					unique: true,
				},
			],
		} as never;

		const result = await afterUpsertHandler(options)(context, {
			meta: {
				collection: routeGroup,
				collectionKey: "route-group",
				collectionTableNames: {} as never,
				userId: 1,
			},
			data: {
				documentId: 4,
				versionId: 12,
				versionType: "latest",
				bricks: [],
				fields: [{ key: "route_key", type: "text", value: "new-key" }],
			},
		});

		expect(result.error).toBeUndefined();
		expect(mocks.propagateRouteSegmentUpdates).toHaveBeenCalledWith(context, {
			options,
			targetCollectionKey: "route-group",
			targetDocumentId: 4,
			targetVersionType: "latest",
		});
	});
});

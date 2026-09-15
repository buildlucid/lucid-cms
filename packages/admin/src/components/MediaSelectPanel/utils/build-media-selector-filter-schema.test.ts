import { describe, expect, test } from "vitest";
import buildMediaSelectorFilterSchema from "./build-media-selector-filter-schema";

describe("buildMediaSelectorFilterSchema", () => {
	test("creates an OR branch per allowed media type", () => {
		const schema = buildMediaSelectorFilterSchema({
			types: ["image", "audio", "image"],
			extensions: "jpg,mp3",
		});

		expect(schema.defaultOrFilterGroups).toEqual([
			[
				{ key: "type", value: "image" },
				{ key: "extension", value: "jpg,mp3" },
			],
			[
				{ key: "type", value: "audio" },
				{ key: "extension", value: "jpg,mp3" },
			],
		]);
	});
});

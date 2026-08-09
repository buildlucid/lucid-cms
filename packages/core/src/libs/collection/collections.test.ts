import { describe, expect, test } from "vitest";
import type { ServiceContext } from "../../types.js";
import { copy } from "../i18n/index.js";
import BrickBuilder from "./builders/brick-builder/index.js";
import CollectionBuilder from "./builders/collection-builder/index.js";
import collections from "./collections.js";

const pages = new CollectionBuilder("pages", {
	mode: "multiple",
	details: {
		name: copy.literal("Pages"),
		singularName: copy.literal("Page"),
	},
	bricks: {
		builder: [new BrickBuilder("content")],
		fixed: [new BrickBuilder("metadata")],
		embedded: [new BrickBuilder("callout")],
	},
});

const context = {
	config: {
		collections: [pages],
	},
} as ServiceContext;

describe("collections", () => {
	test("gets all collections", async () => {
		const result = await collections.getAll(context, {});

		expect(result).toEqual({
			error: undefined,
			data: [pages],
		});
	});

	test("gets a collection by key", async () => {
		const result = await collections.getSingle(context, { key: "pages" });

		expect(result).toEqual({
			error: undefined,
			data: pages,
		});
	});

	test("returns a not found response for an unknown collection", async () => {
		const result = await collections.getSingle(context, { key: "unknown" });

		expect(result.error?.status).toBe(404);
		expect(result.data).toBeUndefined();
	});

	test("gets collection bricks in builder, fixed, then embedded order", async () => {
		const allBricks = await collections.getBricks(context, {
			collection: pages,
		});
		const builderBricks = await collections.getBricks(context, {
			collection: pages,
			type: "builder",
		});
		const fixedBricks = await collections.getBricks(context, {
			collection: pages,
			type: "fixed",
		});
		const embeddedBricks = await collections.getBricks(context, {
			collection: pages,
			type: "embedded",
		});

		expect(allBricks.data?.map((brick) => brick.key)).toEqual([
			"content",
			"metadata",
			"callout",
		]);
		expect(builderBricks.data?.map((brick) => brick.key)).toEqual(["content"]);
		expect(fixedBricks.data?.map((brick) => brick.key)).toEqual(["metadata"]);
		expect(embeddedBricks.data?.map((brick) => brick.key)).toEqual(["callout"]);
	});

	test("gets a brick by key and optional type", async () => {
		const content = await collections.getBrick(context, {
			collection: pages,
			key: "content",
		});
		const metadata = await collections.getBrick(context, {
			collection: pages,
			key: "metadata",
			type: "fixed",
		});
		const missing = await collections.getBrick(context, {
			collection: pages,
			key: "content",
			type: "fixed",
		});

		expect(content.data?.key).toBe("content");
		expect(metadata.data?.key).toBe("metadata");
		expect(missing.data).toBeUndefined();
	});
});

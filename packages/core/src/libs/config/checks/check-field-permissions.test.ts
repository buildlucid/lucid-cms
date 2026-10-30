import { describe, expect, test } from "vitest";
import BrickBuilder from "../../collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import type { CollectionOptions } from "../../collection/builders/collection-builder/types.js";
import checkFieldPermissions from "./check-field-permissions.js";

const buildCollection = (options: Partial<CollectionOptions<"pages">> = {}) =>
	new CollectionBuilder("pages", {
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		...options,
	});

const check = (collection: CollectionBuilder) => () =>
	checkFieldPermissions(collection);

describe("checkFieldPermissions", () => {
	test("accepts permissions on fields, containers and bricks", () => {
		const collection = buildCollection({
			bricks: {
				builder: [new BrickBuilder("legal", { permissions: { update: true } })],
			},
		})
			.addTab("seo", { permissions: { read: true } })
			.addText("metaTitle", { permissions: { update: true } });

		expect(check(collection)).not.toThrow();
	});

	test("rejects read permissions on embedded bricks", () => {
		const collection = buildCollection({
			bricks: {
				embedded: [new BrickBuilder("quote", { permissions: { read: true } })],
			},
		});

		expect(check(collection)).toThrow(/can only have an update permission/);
	});

	test("rejects label fields that some readers can't see", () => {
		const collection = buildCollection()
			.addSection("meta", { permissions: { read: true } })
			.addText("title", { useAsLabel: true })
			.endSection();

		expect(check(collection)).toThrow(/labels or routes documents/);
	});
});

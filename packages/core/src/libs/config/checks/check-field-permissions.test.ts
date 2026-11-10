import { describe, expect, test } from "vitest";
import defineBrick from "../../collection/define-brick.js";
import defineCollection from "../../collection/define-collection.js";
import type CollectionDefinition from "../../collection/definitions/collection/index.js";
import type { CollectionOptions } from "../../collection/definitions/collection/types.js";
import field from "../../collection/definitions/fields/field.js";
import checkFieldPermissions from "./check-field-permissions.js";

const buildCollection = (options: Partial<CollectionOptions<"pages">> = {}) =>
	defineCollection({
		key: "pages",
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		...options,
	});

const check = (collection: CollectionDefinition) => () =>
	checkFieldPermissions(collection);

describe("checkFieldPermissions", () => {
	test("accepts permissions on fields, containers and bricks", () => {
		const collection = buildCollection({
			bricks: {
				builder: [defineBrick({ key: "legal", permissions: { update: true } })],
			},
		}).insertFields([
			field.tab("seo", {
				permissions: { read: true },
				fields: [field.text("metaTitle", { permissions: { update: true } })],
			}),
		]);

		expect(check(collection)).not.toThrow();
	});

	test("rejects read permissions on embedded bricks", () => {
		const collection = buildCollection({
			bricks: {
				embedded: [defineBrick({ key: "quote", permissions: { read: true } })],
			},
		});

		expect(check(collection)).toThrow(/can only have an update permission/);
	});

	test("rejects label fields that some readers can't see", () => {
		const collection = buildCollection().insertFields([
			field.section("meta", {
				permissions: { read: true },
				fields: [field.text("title", { useAsLabel: true })],
			}),
		]);

		expect(check(collection)).toThrow(/labels or routes documents/);
	});
});

import { expect, test } from "vitest";
import z from "zod";
import defineBrick from "../collection/define-brick.js";
import defineCollection from "../collection/define-collection.js";
import field from "../collection/definitions/fields/field.js";
import collectionsFormatter from "./collections.js";

test("collection field responses expose validation metadata and preserve server schemas", () => {
	const schema = z.string().min(3);
	const collection = defineCollection({
		key: "pages",
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		fields: [
			field.repeater("items", {
				fields: [
					field.text("title", { validation: { required: true, zod: schema } }),
				],
			}),
		],
	});
	const response = collectionsFormatter.formatSingle({
		collection,
		localization: {
			locales: [{ code: "en", label: "English" }],
			defaultLocale: "en",
		},
		include: { fields: true },
	});
	const repeater = response.fields[0];
	expect(repeater?.type).toBe("repeater");
	if (repeater?.type !== "repeater")
		throw new Error("Expected the items repeater");
	const title = repeater.fields[0];
	expect(title?.type).toBe("text");
	if (title?.type !== "text") throw new Error("Expected the title text field");
	expect(title.validation).toEqual({ required: true });
	const source = collection.fields.get("title");
	if (source?.config.type !== "text")
		throw new Error("Expected the configured text field");
	expect(source.config.validation?.zod).toBe(schema);
});

test("collection responses send the permissions fields and bricks opt in to", () => {
	const collection = defineCollection({
		key: "pages",
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		bricks: {
			builder: [
				defineBrick({
					key: "banner",
					permissions: { update: true },
					fields: [field.text("cta", { permissions: { read: true } })],
				}),
			],
		},
		fields: [
			field.text("title"),
			field.tab("seo", {
				permissions: { read: true, update: true },
				fields: [field.text("metaTitle")],
			}),
		],
	});
	const response = collectionsFormatter.formatSingle({
		collection,
		localization: {
			locales: [{ code: "en", label: "English" }],
			defaultLocale: "en",
		},
		include: { fields: true, bricks: true },
	});

	expect(response.fields[0]?.permissions).toBeUndefined();
	expect(response.fields[1]?.permissions).toEqual({
		read: "documents:pages:fields:seo:read",
		update: "documents:pages:fields:seo:update",
	});
	expect(response.builderBricks[0]?.permissions).toEqual({
		update: "documents:pages:bricks:banner:update",
	});
	expect(response.builderBricks[0]?.fields[0]?.permissions).toEqual({
		read: "documents:pages:bricks:banner:fields:cta:read",
	});
});

test("collection responses leave out what the reader can't see, and conditions that depend on it", () => {
	const collection = defineCollection({
		key: "pages",
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		bricks: {
			builder: [
				defineBrick({ key: "banner", fields: [field.text("cta")] }),
				defineBrick({ key: "legal", permissions: { read: true } }),
			],
		},
		fields: [
			field.checkbox("promoted", { permissions: { read: true } }),
			field.text("code", {
				ui: { condition: { all: [{ field: "promoted", value: true }] } },
			}),
		],
	});
	const response = collectionsFormatter.formatSingle({
		collection,
		localization: {
			locales: [{ code: "en", label: "English" }],
			defaultLocale: "en",
		},
		include: { fields: true, bricks: true },
		reader: { superAdmin: false, permissions: [] },
	});

	expect(response.fields.map((field) => field.key)).toEqual(["code"]);
	expect(response.fields[0]?.ui?.condition).toBeUndefined();
	expect(response.builderBricks.map((brick) => brick.key)).toEqual(["banner"]);
});

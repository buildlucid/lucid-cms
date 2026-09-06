import { expect, test } from "vitest";
import z from "zod";
import CollectionBuilder from "../collection/builders/collection-builder/index.js";
import collectionsFormatter from "./collections.js";

test("collection field responses expose validation metadata and preserve server schemas", () => {
	const schema = z.string().min(3);
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
	})
		.addRepeater("items")
		.addText("title", { validation: { required: true, zod: schema } })
		.endRepeater();
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

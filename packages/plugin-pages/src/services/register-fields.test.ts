import { CollectionBuilder, copy } from "@lucidcms/core";
import { expect, test } from "vitest";
import type { ZodType } from "zod";
import registerFields from "./register-fields.js";

const slugSlashMessage = 'Only use a slash when the slug is exactly "/".';
const slugSpaceMessage = "The slug cannot contain spaces.";
const slugFormatMessage =
	"The slug may only contain letters, numbers, underscores, and hyphens.";

test("slug validation returns specific English zod messages", () => {
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: copy("admin:tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
		},
	});

	registerFields(collection as never, {
		collectionKey: "pages",
		localized: false,
		displayFullSlug: true,
		unique: true,
	});

	const slugField = collection.flatFields.find((field) => field.key === "slug");
	const schema = (
		slugField as { validation?: { zod?: ZodType<unknown> } } | undefined
	)?.validation?.zod;
	if (!schema) throw new Error("Expected slug field zod validation");

	const slashResult = schema.safeParse("/example");
	if (slashResult.success) throw new Error("Expected slash validation to fail");
	expect(slashResult.error.issues[0]).toMatchObject({
		code: "custom",
		message: slugSlashMessage,
	});

	const trailingSlashResult = schema.safeParse("example/");
	if (trailingSlashResult.success) {
		throw new Error("Expected trailing slash validation to fail");
	}
	expect(trailingSlashResult.error.issues[0]).toMatchObject({
		code: "custom",
		message: slugSlashMessage,
	});

	const spaceResult = schema.safeParse("not valid");
	if (spaceResult.success) throw new Error("Expected space validation to fail");
	expect(spaceResult.error.issues[0]).toMatchObject({
		code: "custom",
		message: slugSpaceMessage,
	});

	const characterResult = schema.safeParse("not-valid!");
	if (characterResult.success) {
		throw new Error("Expected character validation to fail");
	}
	expect(characterResult.error.issues[0]).toMatchObject({
		code: "custom",
		message: slugFormatMessage,
	});
});

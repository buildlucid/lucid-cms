import { CollectionBuilder, copy } from "@lucidcms/core";
import { expect, test } from "vitest";
import type { ZodType } from "zod";
import registerFields from "./register-fields.js";

const slugFormatMessage =
	"The slug field may only contain letters, numbers, underscores, and hyphens.";

test("slug validation returns an English zod message", () => {
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
	});

	const slugField = collection.flatFields.find((field) => field.key === "slug");
	const schema = (
		slugField as { validation?: { zod?: ZodType<unknown> } } | undefined
	)?.validation?.zod;
	if (!schema) throw new Error("Expected slug field zod validation");

	const result = schema.safeParse("not valid");
	if (result.success) throw new Error("Expected slug validation to fail");

	expect(result.error.issues[0]).toMatchObject({
		code: "custom",
		message: slugFormatMessage,
	});
});

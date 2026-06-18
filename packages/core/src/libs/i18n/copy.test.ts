import { expect, test } from "vitest";
import {
	adminCopyInputSchema,
	copy,
	createTranslationStore,
	createTranslator,
	normalizeCopy,
} from "./index.js";

test("normalizeCopy converts plain strings into literal copy", () => {
	expect(normalizeCopy("Posts")).toEqual({
		type: "lucid.literal",
		value: "Posts",
	});
});

test("normalizeCopy returns descriptors and literals unchanged", () => {
	const descriptor = copy("admin:collections.posts.name", {
		defaultMessage: "Posts",
	});
	const literal = copy.literal("Posts");

	expect(normalizeCopy(descriptor)).toBe(descriptor);
	expect(normalizeCopy(literal)).toBe(literal);
});

test("normalizeCopy passes nullish values through", () => {
	expect(normalizeCopy(undefined)).toBeUndefined();
	expect(normalizeCopy(null)).toBeNull();
});

test("adminCopyInputSchema accepts and normalises a plain string", () => {
	expect(adminCopyInputSchema.parse("Posts")).toEqual({
		type: "lucid.literal",
		value: "Posts",
	});
});

test("adminCopyInputSchema leaves descriptors and literals intact", () => {
	const descriptor = copy("admin:collections.posts.name");
	const literal = copy.literal("Posts");

	expect(adminCopyInputSchema.parse(descriptor)).toEqual(descriptor);
	expect(adminCopyInputSchema.parse(literal)).toEqual(literal);
});

test("translator resolves normalised literal copy without treating it as a key", () => {
	const store = createTranslationStore({
		defaultLocale: "en",
		bundles: {
			en: {
				admin: { "tests.label": "Should not be used" },
				server: {},
			},
		},
	});
	const translator = createTranslator({ store, locale: "en" });

	// A literal authored as a plain string is rendered verbatim, even if its
	// value happens to match a translation key.
	expect(translator(normalizeCopy("tests.label"))).toBe("tests.label");
	expect(translator(normalizeCopy("Acme Corp"))).toBe("Acme Corp");
});

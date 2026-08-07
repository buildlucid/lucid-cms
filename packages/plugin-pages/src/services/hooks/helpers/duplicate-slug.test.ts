import { expect, test } from "vitest";
import {
	applyDuplicateSlugCandidate,
	getDuplicateSlugCandidate,
	getDuplicateSlugSource,
	isFullSlugCollisionError,
} from "./duplicate-slug.js";

test("adds and increments a copy suffix", () => {
	expect(getDuplicateSlugCandidate("about", 1)).toBe("about-copy");
	expect(getDuplicateSlugCandidate("about", 2)).toBe("about-copy-2");
	expect(getDuplicateSlugCandidate("about-copy", 1)).toBe("about-copy-2");
	expect(getDuplicateSlugCandidate("about-copy-3", 1)).toBe("about-copy-4");
});

test("uses a valid slug when duplicating the root page", () => {
	expect(getDuplicateSlugCandidate("/", 1)).toBe("copy");
	expect(getDuplicateSlugCandidate("/", 2)).toBe("copy-2");
	expect(getDuplicateSlugCandidate("copy", 1)).toBe("copy-2");
	expect(getDuplicateSlugCandidate("copy-3", 1)).toBe("copy-4");
});

test("updates localized slug values from an unchanged source", () => {
	const field = {
		key: "slug",
		type: "text" as const,
		translations: { en: "about", fr: "a-propos-copy" },
	};
	const source = getDuplicateSlugSource(field);

	applyDuplicateSlugCandidate(field, source, 1);
	expect(field.translations).toEqual({
		en: "about-copy",
		fr: "a-propos-copy-2",
	});

	applyDuplicateSlugCandidate(field, source, 2);
	expect(field.translations).toEqual({
		en: "about-copy-2",
		fr: "a-propos-copy-3",
	});
});

test("only identifies slug field conflicts as retryable", () => {
	expect(
		isFullSlugCollisionError({
			status: 400,
			errors: { fields: [{ key: "slug" }] },
		}),
	).toBe(true);
	expect(isFullSlugCollisionError({ status: 500 })).toBe(false);
	expect(
		isFullSlugCollisionError({
			status: 400,
			errors: { fields: [{ key: "title" }] },
		}),
	).toBe(false);
});

import { describe, expect, test } from "vitest";
import toSafeTableName from "./to-safe-table-name.js";

describe("toSafeTableName", () => {
	test("returns original name when under limit", () => {
		const raw = "lucid_document__page__banner__rep__items";
		const res = toSafeTableName(raw, 63);

		expect(res.name).toBe(raw);
		expect(res.rawName).toBe(raw);
	});

	test("hashes only the tail after the stable prefix when over limit", () => {
		const raw =
			"lucid_document__page__banner__rep__items__nested_items__deep_nested__deeply_nested_items";
		const res = toSafeTableName(raw, 63);

		expect(res.rawName).toBe(raw);
		expect(res.name.startsWith("lucid_document__page__banner__rep_")).toBe(
			true,
		);
		expect(res.name).toMatch(/^lucid_document__page__banner__rep_[0-9a-f]{8}$/);
	});

	test("preserves separator section for other relation table types", () => {
		const mediaRaw =
			"lucid_document__page__banner__med__hero_image__extremely_long_media_reference_key";
		const userRaw =
			"lucid_document__page__banner__usr__author__very_long_user_reference_key";
		const documentRaw =
			"lucid_document__page__banner__doc__related_post__very_long_document_reference_key";

		const media = toSafeTableName(mediaRaw, 63);
		const user = toSafeTableName(userRaw, 63);
		const document = toSafeTableName(documentRaw, 63);

		expect(media.name).toMatch(
			/^lucid_document__page__banner__med_[0-9a-f]{8}$/,
		);
		expect(user.name).toMatch(
			/^lucid_document__page__banner__usr_[0-9a-f]{8}$/,
		);
		expect(document.name).toMatch(
			/^lucid_document__page__banner__doc_[0-9a-f]{8}$/,
		);
	});

	test("does not alter first three sections even if over limit without relation tail", () => {
		const raw = `lucid_document__${"a".repeat(60)}__ver`;
		const res = toSafeTableName(raw, 63);

		expect(res.name).toBe(raw);
		expect(res.rawName).toBe(raw);
	});

	test("floors provided limit to minimum supported table-name limit", () => {
		const raw =
			"lucid_document__page__banner__rep__items__nested_items__deep_nested__deeply_nested_items";
		const withLowLimit = toSafeTableName(raw, 10);
		const withFloorLimit = toSafeTableName(raw, 63);

		expect(withLowLimit).toEqual(withFloorLimit);
		expect(withLowLimit.name).toMatch(
			/^lucid_document__page__banner__rep_[0-9a-f]{8}$/,
		);
	});
});

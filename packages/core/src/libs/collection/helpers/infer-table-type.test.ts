import { describe, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import inferTableType from "./infer-table-type.js";
import toSafeTableName from "./to-safe-table-name.js";

const TABLE_NAME_LIMIT = 63;

describe("inferTableType", () => {
	test("document names (short + hashed)", () => {
		const shortRaw = "lucid_doc__pages";
		const longRaw = `lucid_doc__${"a".repeat(60)}`;

		const shortSafe = toSafeTableName(shortRaw, TABLE_NAME_LIMIT);
		const longSafe = toSafeTableName(longRaw, TABLE_NAME_LIMIT);

		expect(shortSafe.name).toBe(shortRaw);
		expect(longSafe.name).toBe(longRaw);

		const shortRes = inferTableType(shortSafe.name);
		const longRes = inferTableType(longSafe.name);

		expect(shortRes.error).toBeUndefined();
		expect(shortRes.data).toBe("document");
		expect(longRes.data).toBe("document");
		expect(longRes.error).toBeUndefined();
	});

	test("versions names (short + hashed)", () => {
		const shortRaw = "lucid_doc__pages__ver";
		const longRaw = `lucid_doc__${"a".repeat(38)}__ver`;

		const shortSafe = toSafeTableName(shortRaw, TABLE_NAME_LIMIT);
		const longSafe = toSafeTableName(longRaw, TABLE_NAME_LIMIT);

		expect(shortSafe.name).toBe(shortRaw);
		expect(longSafe.name).toBe(longRaw);

		const shortRes = inferTableType(shortSafe.name);
		const longRes = inferTableType(longSafe.name);

		expect(shortRes.error).toBeUndefined();
		expect(shortRes.data).toBe("versions");
		expect(longRes.error).toBeUndefined();
		expect(longRes.data).toBe("versions");
	});

	test("document-fields names (short + hashed)", () => {
		const shortRaw = "lucid_doc__pages__fld";
		const longRaw = `lucid_doc__${"a".repeat(50)}__fld`;

		const shortSafe = toSafeTableName(shortRaw, TABLE_NAME_LIMIT);
		const longSafe = toSafeTableName(longRaw, TABLE_NAME_LIMIT);

		expect(shortSafe.name).toBe(shortRaw);
		expect(longSafe.name).toBe(longRaw);

		const shortRes = inferTableType(shortSafe.name);
		const longRes = inferTableType(longSafe.name);

		expect(shortRes.error).toBeUndefined();
		expect(shortRes.data).toBe("document-fields");
		expect(longRes.data).toBe("document-fields");
		expect(longRes.error).toBeUndefined();
	});

	test("brick names (short + hashed)", () => {
		const shortRaw = "lucid_doc__pages__hero";
		const longRaw = `lucid_doc__${"a".repeat(38)}__${"hero".repeat(6)}`;

		const shortSafe = toSafeTableName(shortRaw, TABLE_NAME_LIMIT);
		const longSafe = toSafeTableName(longRaw, TABLE_NAME_LIMIT);

		expect(shortSafe.name).toBe(shortRaw);
		expect(longSafe.name).toBe(longRaw);

		const shortRes = inferTableType(shortSafe.name);
		const longRes = inferTableType(longSafe.name);

		expect(shortRes.error).toBeUndefined();
		expect(shortRes.data).toBe("brick");
		expect(longRes.error).toBeUndefined();
		expect(longRes.data).toBe("brick");
	});

	test("repeater names (short + hashed)", () => {
		const shortRaw = "lucid_doc__page__banner__rep__items";
		const longRaw =
			"lucid_doc__page__banner__rep__items__nested_items__deeply_nested_items";

		const shortSafe = toSafeTableName(shortRaw, TABLE_NAME_LIMIT);
		const longSafe = toSafeTableName(longRaw, TABLE_NAME_LIMIT);

		expect(shortSafe.name).toBe(shortRaw);
		expect(longSafe.name).not.toBe(longRaw);

		const shortRes = inferTableType(shortSafe.name);
		const longRes = inferTableType(longSafe.name);

		expect(shortRes.error).toBeUndefined();
		expect(shortRes.data).toBe(
			`${constants.db.customFieldTablePrefix}repeater`,
		);
		expect(longRes.error).toBeUndefined();
		expect(longRes.data).toBe(`${constants.db.customFieldTablePrefix}repeater`);
	});

	test("unknown custom-field separators return errors", () => {
		const tableNames = [
			{
				short: "lucid_doc__page__banner__med__hero_image",
				long: "lucid_doc__page__banner__med__hero_image__extremely_long_media_reference_key",
			},
			{
				short: "lucid_doc__page__banner__doc__related_post",
				long: "lucid_doc__page__banner__doc__related_post__very_long_document_reference_key",
			},
			{
				short: "lucid_doc__page__banner__usr__author",
				long: "lucid_doc__page__banner__usr__author__very_long_user_reference_key",
			},
		] as const;

		for (const entry of tableNames) {
			const shortSafe = toSafeTableName(entry.short, TABLE_NAME_LIMIT);
			const longSafe = toSafeTableName(entry.long, TABLE_NAME_LIMIT);

			expect(shortSafe.name).toBe(entry.short);
			expect(longSafe.name).not.toBe(entry.long);

			const shortRes = inferTableType(shortSafe.name);
			const longRes = inferTableType(longSafe.name);

			expect(shortRes.error).toBeDefined();
			expect(shortRes.data).toBeUndefined();
			expect(longRes.error).toBeDefined();
			expect(longRes.data).toBeUndefined();
		}
	});
});

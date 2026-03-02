import { describe, expect, test } from "vitest";
import inferTableType from "./infer-table-type.js";
import toSafeTableName from "./to-safe-table-name.js";

const TABLE_NAME_LIMIT = 63;

describe("inferTableType", () => {
	test("document names (short + hashed)", () => {
		const shortRaw = "lucid_document__pages";
		const longRaw = `lucid_document__${"a".repeat(60)}`;

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
		const shortRaw = "lucid_document__pages__versions";
		const longRaw = `lucid_document__${"a".repeat(38)}__versions`;

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
		const shortRaw = "lucid_document__pages__fields";
		const longRaw = `lucid_document__${"a".repeat(50)}__fields`;

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
		const shortRaw = "lucid_document__pages__hero";
		const longRaw = `lucid_document__${"a".repeat(38)}__${"hero".repeat(6)}`;

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
		const shortRaw = "lucid_document__page__banner__rep__items";
		const longRaw =
			"lucid_document__page__banner__rep__items__nested_items__deeply_nested_items";

		const shortSafe = toSafeTableName(shortRaw, TABLE_NAME_LIMIT);
		const longSafe = toSafeTableName(longRaw, TABLE_NAME_LIMIT);

		expect(shortSafe.name).toBe(shortRaw);
		expect(longSafe.name).not.toBe(longRaw);

		const shortRes = inferTableType(shortSafe.name);
		const longRes = inferTableType(longSafe.name);

		expect(shortRes.error).toBeUndefined();
		expect(shortRes.data).toBe("repeater");
		expect(longRes.error).toBeUndefined();
		expect(longRes.data).toBe("repeater");
	});

	test("media relation names (short + hashed)", () => {
		const shortRaw = "lucid_document__page__banner__med__hero_image";
		const longRaw =
			"lucid_document__page__banner__med__hero_image__extremely_long_media_reference_key";

		const shortSafe = toSafeTableName(shortRaw, TABLE_NAME_LIMIT);
		const longSafe = toSafeTableName(longRaw, TABLE_NAME_LIMIT);

		expect(shortSafe.name).toBe(shortRaw);
		expect(longSafe.name).not.toBe(longRaw);

		const shortRes = inferTableType(shortSafe.name);
		const longRes = inferTableType(longSafe.name);

		expect(shortRes.error).toBeUndefined();
		expect(shortRes.data).toBe("media-rel");
		expect(longRes.error).toBeUndefined();
		expect(longRes.data).toBe("media-rel");
	});

	test("document relation names (short + hashed)", () => {
		const shortRaw = "lucid_document__page__banner__doc__related_post";
		const longRaw =
			"lucid_document__page__banner__doc__related_post__very_long_document_reference_key";

		const shortSafe = toSafeTableName(shortRaw, TABLE_NAME_LIMIT);
		const longSafe = toSafeTableName(longRaw, TABLE_NAME_LIMIT);

		expect(shortSafe.name).toBe(shortRaw);
		expect(longSafe.name).not.toBe(longRaw);

		const shortRes = inferTableType(shortSafe.name);
		const longRes = inferTableType(longSafe.name);

		expect(shortRes.error).toBeUndefined();
		expect(shortRes.data).toBe("document-rel");
		expect(longRes.error).toBeUndefined();
		expect(longRes.data).toBe("document-rel");
	});

	test("user relation names (short + hashed)", () => {
		const shortRaw = "lucid_document__page__banner__usr__author";
		const longRaw =
			"lucid_document__page__banner__usr__author__very_long_user_reference_key";

		const shortSafe = toSafeTableName(shortRaw, TABLE_NAME_LIMIT);
		const longSafe = toSafeTableName(longRaw, TABLE_NAME_LIMIT);

		expect(shortSafe.name).toBe(shortRaw);
		expect(longSafe.name).not.toBe(longRaw);

		const shortRes = inferTableType(shortSafe.name);
		const longRes = inferTableType(longSafe.name);

		expect(shortRes.error).toBeUndefined();
		expect(shortRes.data).toBe("user-rel");
		expect(longRes.error).toBeUndefined();
		expect(longRes.data).toBe("user-rel");
	});
});

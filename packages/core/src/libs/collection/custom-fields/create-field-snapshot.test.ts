import { expect, expectTypeOf, test } from "vitest";
import type { FieldSnapshot } from "../builders/field-builder/types.js";
import createFieldSnapshot from "./create-field-snapshot.js";
import SelectCustomField from "./fields/select/custom-field.js";
import type { CustomFieldAiContext, FieldOptions } from "./types.js";

test("field inspection copies configuration and excludes the internal field instance", () => {
	const field = new SelectCustomField("layout", {
		index: false,
		options: [{ label: "Card", value: "card" }],
		ui: {
			condition: {
				all: [{ field: "enabled", operator: "equals", value: true }],
			},
		},
	});
	field.treeParent = "items";
	const snapshot = createFieldSnapshot(field);

	expect(snapshot).toEqual({
		key: "layout",
		type: "select",
		config: field.config,
		treeParent: "items",
		tabParent: null,
		structuralParent: null,
	});
	expect(snapshot.config).not.toBe(field.config);
	expect(snapshot.config.options).not.toBe(field.config.options);
	expect(snapshot.config.ui?.condition).not.toBe(field.config.ui?.condition);
	expect(snapshot.config.index).toBe(false);
	expect(snapshot).not.toHaveProperty("validate");

	expectTypeOf(snapshot).toEqualTypeOf<FieldSnapshot<"select">>();
	expectTypeOf<CustomFieldAiContext<"select">["field"]>().toEqualTypeOf<
		FieldSnapshot<"select">
	>();
	expectTypeOf<FieldOptions<"text">>().not.toHaveProperty("key");
	expectTypeOf<FieldOptions<"repeater">>().not.toHaveProperty("fields");
	expectTypeOf<FieldOptions<"relation">>().not.toHaveProperty("resource");
});

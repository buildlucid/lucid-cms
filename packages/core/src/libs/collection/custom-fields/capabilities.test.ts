import { describe, expect, it } from "vitest";
import {
	fieldTypeCapabilities,
	getFieldTypeCapabilities,
	isFieldTypeFilterable,
	isFieldTypeSortable,
} from "./capabilities.js";
import registeredFields from "./registered-fields.js";
import { fieldTypes } from "./types.js";

describe("field type capabilities", () => {
	it("covers every registered field type", () => {
		expect(Object.keys(fieldTypeCapabilities).sort()).toEqual(
			[...fieldTypes].sort(),
		);
	});

	it("matches the capabilities on each registered field config", () => {
		for (const fieldType of fieldTypes) {
			expect(getFieldTypeCapabilities(fieldType)).toEqual(
				registeredFields[fieldType].config.capabilities,
			);
		}
	});

	it("only marks scalar value field types as sortable", () => {
		const sortable = fieldTypes.filter((fieldType) =>
			isFieldTypeSortable(fieldType),
		);
		expect(sortable.sort()).toEqual(
			["text", "textarea", "number", "datetime", "select"].sort(),
		);
	});

	it("marks all value field types as filterable and structural types as not", () => {
		const notFilterable = fieldTypes.filter(
			(fieldType) => !isFieldTypeFilterable(fieldType),
		);
		expect(notFilterable.sort()).toEqual(
			["collapsible", "repeater", "section", "tab"].sort(),
		);
	});

	it("treats unknown field types as supporting nothing", () => {
		expect(getFieldTypeCapabilities("unknown")).toEqual({
			filterable: false,
			sortable: false,
		});
		expect(isFieldTypeSortable("unknown")).toBe(false);
		expect(isFieldTypeFilterable("unknown")).toBe(false);
	});
});

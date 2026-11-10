import { expect, test } from "vitest";
import { copy } from "../../../i18n/index.js";
import defineBrick from "../../define-brick.js";
import field from "./field.js";
import { getFieldSetState } from "./index.js";

test("all fields should be added", async () => {
	const instance = defineBrick({
		key: "test",
		fields: [
			field.text("text_test"),
			field.textarea("textarea_test"),
			field.richText("rich_text_test"),
			field.number("number_test"),
			field.range("range_test"),
			field.checkbox("checkbox_test"),
			field.select("select_test"),
			field.json("json_test"),
			field.color("color_test"),
			field.media("media_test"),
			field.datetime("datetime_test"),
			field.link("link_test"),
			field.user("user_test"),
			field.repeater("repeater_test", {
				fields: [field.text("repeater_text_test")],
			}),
		],
	});
	expect(getFieldSetState(instance).fields.size).toBe(15);
	expect(getFieldSetState(instance).fields.get("text_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("textarea_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("rich_text_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("number_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("range_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("checkbox_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("select_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("json_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("color_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("media_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("datetime_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("link_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("user_test")).toBeDefined();
	expect(getFieldSetState(instance).fields.get("repeater_test")).toBeDefined();
	expect(
		getFieldSetState(instance).fields.get("repeater_text_test"),
	).toBeDefined();
});

test("repeater fields should be nested correctly", async () => {
	const instance = defineBrick({
		key: "test",
		fields: [
			field.repeater("repeater_test", {
				fields: [field.text("text_test"), field.text("text_test_2")],
			}),
			field.repeater("repeater_test_2", {
				fields: [
					field.text("text_test_3"),
					field.text("text_test_4"),
					field.repeater("repeater_test_3", {
						fields: [
							field.text("text_test_5"),
							field.text("text_test_6"),
							field.repeater("repeater_test_4", {
								fields: [field.text("text_test_7"), field.text("text_test_8")],
							}),
						],
					}),
				],
			}),
		],
	});

	expect(instance.fieldTree.length).toBe(2);

	const firstRepeater = instance.fieldTree[0];
	if (firstRepeater?.type === "repeater") {
		expect(firstRepeater.fields.length).toBe(2);
		expect(firstRepeater.fields[0]?.key).toBe("text_test");
		expect(firstRepeater.fields[1]?.key).toBe("text_test_2");
	}

	const secondRepeater = instance.fieldTree[1];
	if (secondRepeater?.type === "repeater") {
		expect(secondRepeater.fields.length).toBe(3);
		expect(secondRepeater.fields[0]?.key).toBe("text_test_3");
		expect(secondRepeater.fields[1]?.key).toBe("text_test_4");
		expect(secondRepeater.fields[2]?.key).toBe("repeater_test_3");

		const thirdRepeater = secondRepeater.fields[2];
		if (thirdRepeater?.type === "repeater") {
			expect(thirdRepeater.fields.length).toBe(3);
			expect(thirdRepeater.fields[0]?.key).toBe("text_test_5");
			expect(thirdRepeater.fields[1]?.key).toBe("text_test_6");

			const fourthRepeater = thirdRepeater.fields[0];
			if (fourthRepeater?.type === "repeater") {
				expect(fourthRepeater.fields.length).toBe(2);
				expect(fourthRepeater.fields[0]?.key).toBe("text_test_7");
				expect(fourthRepeater.fields[1]?.key).toBe("text_test_8");
			}
		}
	}
});

test("flat fields should return correct config", async () => {
	const instance = defineBrick({
		key: "test",
		fields: [
			field.text("text_test"),
			field.textarea("textarea_test"),
			field.richText("rich_text_test"),
			field.number("number_test"),
			field.range("range_test"),
			field.checkbox("checkbox_test"),
			field.select("select_test"),
			field.json("json_test"),
			field.color("color_test"),
			field.media("media_test"),
			field.datetime("datetime_test"),
			field.link("link_test"),
			field.user("user_test"),
			field.repeater("repeater_test", {
				fields: [field.text("repeater_text_test")],
			}),
		],
	});

	expect(instance.flatFields.length).toBe(15);

	expect(instance.flatFields).toMatchObject([
		{
			key: "text_test",
			type: "text",
			details: {
				label: copy("admin:fields.text.text_test.label", {
					defaultMessage: "Text Test",
				}),
				description: undefined,
				placeholder: undefined,
			},
			localized: true,
			default: "",
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "textarea_test",
			type: "textarea",
			details: {
				label: copy("admin:fields.textarea.textarea_test.label", {
					defaultMessage: "Textarea Test",
				}),
				description: undefined,
				placeholder: undefined,
			},
			localized: true,
			default: "",
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "rich_text_test",
			type: "rich-text",
			details: {
				label: copy("admin:fields.rich-text.rich_text_test.label", {
					defaultMessage: "Rich Text Test",
				}),
				description: undefined,
				placeholder: undefined,
			},
			localized: true,
			default: {
				type: "doc",
				content: [{ type: "paragraph" }],
			},
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "number_test",
			type: "number",
			details: {
				label: copy("admin:fields.number.number_test.label", {
					defaultMessage: "Number Test",
				}),
				description: undefined,
				placeholder: undefined,
			},
			localized: false,
			default: undefined,
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "range_test",
			type: "range",
			details: {
				label: copy("admin:fields.range.range_test.label", {
					defaultMessage: "Range Test",
				}),
				description: undefined,
			},
			min: 0,
			max: 100,
			step: 1,
			localized: false,
			default: [0],
			index: undefined,
			thumbs: undefined,
			ui: {
				hidden: undefined,
				disabled: undefined,
				condition: undefined,
				width: undefined,
			},
			validation: undefined,
		},
		{
			key: "checkbox_test",
			type: "checkbox",
			details: {
				label: copy("admin:fields.checkbox.checkbox_test.label", {
					defaultMessage: "Checkbox Test",
				}),
				description: undefined,
				true: undefined,
				false: undefined,
			},
			localized: false,
			default: false,
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "select_test",
			type: "select",
			details: {
				label: copy("admin:fields.select.select_test.label", {
					defaultMessage: "Select Test",
				}),
				description: undefined,
				placeholder: undefined,
			},
			localized: false,
			default: "",
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			options: [],
			validation: undefined,
		},
		{
			key: "json_test",
			type: "json",
			details: {
				label: copy("admin:fields.json.json_test.label", {
					defaultMessage: "Json Test",
				}),
				description: undefined,
				placeholder: undefined,
			},
			localized: false,
			default: null,
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "color_test",
			type: "color",
			details: {
				label: copy("admin:fields.color.color_test.label", {
					defaultMessage: "Color Test",
				}),
				description: undefined,
			},
			presets: [],
			localized: false,
			default: "",
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "media_test",
			type: "media",
			details: {
				label: copy("admin:fields.media.media_test.label", {
					defaultMessage: "Media Test",
				}),
				description: undefined,
			},
			localized: false,
			default: [],
			multiple: undefined,
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "datetime_test",
			type: "datetime",
			details: {
				label: copy("admin:fields.datetime.datetime_test.label", {
					defaultMessage: "Datetime Test",
				}),
				description: undefined,
				placeholder: undefined,
			},
			localized: false,
			time: false,
			default: "",
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "link_test",
			type: "link",
			details: {
				label: copy("admin:fields.link.link_test.label", {
					defaultMessage: "Link Test",
				}),
				description: undefined,
				placeholder: undefined,
			},
			localized: false,
			default: {
				url: null,
				label: null,
				target: null,
			},
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "user_test",
			type: "user",
			details: {
				label: copy("admin:fields.user.user_test.label", {
					defaultMessage: "User Test",
				}),
				description: undefined,
			},
			localized: false,
			default: [],
			multiple: undefined,
			ui: {
				hidden: undefined,
				disabled: undefined,
			},

			validation: undefined,
		},
		{
			key: "repeater_test",
			type: "repeater",
			details: {
				label: copy("admin:fields.repeater.repeater_test.label", {
					defaultMessage: "Repeater Test",
				}),
				description: undefined,
			},
			ui: {
				disabled: undefined,
			},
			fields: [],
			validation: undefined,
		},
		{
			key: "repeater_text_test",
			type: "text",
			details: {
				label: copy("admin:fields.text.repeater_text_test.label", {
					defaultMessage: "Repeater Text Test",
				}),
				description: undefined,
				placeholder: undefined,
			},
			localized: true,
			default: "",
			ui: {
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
	]);
});
test("field snapshots reflect added fields", async () => {
	const instance = defineBrick({
		key: "test",
		fields: [field.text("text_test")],
	});

	const initialTree = instance.fieldTree;
	const cachedTree = instance.fieldTree;
	expect(cachedTree).toEqual(initialTree);
	instance.insertFields([field.number("number_test")]);

	const updatedTree = instance.fieldTree;
	expect(updatedTree).not.toBe(initialTree);
	expect(updatedTree.length).toBe(2);
});
test("persisted field snapshots reflect completed repeaters", async () => {
	const instance = defineBrick({
		key: "test",
		fields: [
			field.repeater("repeater_test", { fields: [field.text("text_test")] }),
		],
	});

	const beforeEnd = instance.persistedFieldTree;
	expect(instance.persistedFieldTree).toEqual(beforeEnd);
	instance.insertFields([]);

	const afterEnd = instance.persistedFieldTree;
	expect(afterEnd).not.toBe(beforeEnd);

	const repeater = afterEnd[0];
	if (repeater?.type === "repeater") {
		expect(repeater.fields.length).toBe(1);
		expect(repeater.fields[0]?.key).toBe("text_test");
	}
});

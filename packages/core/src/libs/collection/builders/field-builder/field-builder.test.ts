import { expect, test } from "vitest";
import { text } from "../../../i18n/index.js";
import FieldBuilder from "./index.js";

test("all fields should be added", async () => {
	const instance = new FieldBuilder()
		.addText("text_test")
		.addTextarea("textarea_test")
		.addRichText("rich_text_test")
		.addNumber("number_test")
		.addCheckbox("checkbox_test")
		.addSelect("select_test")
		.addJSON("json_test")
		.addColor("color_test")
		.addMedia("media_test")
		.addDateTime("datetime_test")
		.addLink("link_test")
		.addUser("user_test")
		.addRepeater("repeater_test")
		.addText("repeater_text_test")
		.endRepeater();

	expect(instance.fields.size).toBe(14);

	expect(instance.fields.get("text_test")).toBeDefined();
	expect(instance.fields.get("textarea_test")).toBeDefined();
	expect(instance.fields.get("rich_text_test")).toBeDefined();
	expect(instance.fields.get("number_test")).toBeDefined();
	expect(instance.fields.get("checkbox_test")).toBeDefined();
	expect(instance.fields.get("select_test")).toBeDefined();
	expect(instance.fields.get("json_test")).toBeDefined();
	expect(instance.fields.get("color_test")).toBeDefined();
	expect(instance.fields.get("media_test")).toBeDefined();
	expect(instance.fields.get("datetime_test")).toBeDefined();
	expect(instance.fields.get("link_test")).toBeDefined();
	expect(instance.fields.get("user_test")).toBeDefined();
	expect(instance.fields.get("repeater_test")).toBeDefined();
	expect(instance.fields.get("repeater_text_test")).toBeDefined();
});

test("repeater fields should be nested correctly", async () => {
	const instance = new FieldBuilder()
		.addRepeater("repeater_test")
		.addText("text_test")
		.addText("text_test_2")
		.endRepeater()
		.addRepeater("repeater_test_2")
		.addText("text_test_3")
		.addText("text_test_4")
		.addRepeater("repeater_test_3")
		.addText("text_test_5")
		.addText("text_test_6")
		.addRepeater("repeater_test_4")
		.addText("text_test_7")
		.addText("text_test_8")
		.endRepeater()
		.endRepeater()
		.endRepeater();

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
	const instance = new FieldBuilder()
		.addText("text_test")
		.addTextarea("textarea_test")
		.addRichText("rich_text_test")
		.addNumber("number_test")
		.addCheckbox("checkbox_test")
		.addSelect("select_test")
		.addJSON("json_test")
		.addColor("color_test")
		.addMedia("media_test")
		.addDateTime("datetime_test")
		.addLink("link_test")
		.addUser("user_test")
		.addRepeater("repeater_test")
		.addText("repeater_text_test")
		.endRepeater();

	expect(instance.flatFields.length).toBe(14);

	expect(instance.flatFields).toMatchObject([
		{
			key: "text_test",
			type: "text",
			details: {
				label: text.admin("fields.text.text_test.label", {
					defaultMessage: "Text Test",
				}),
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				localized: true,
				default: "",
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "textarea_test",
			type: "textarea",
			details: {
				label: text.admin("fields.textarea.textarea_test.label", {
					defaultMessage: "Textarea Test",
				}),
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				localized: true,
				default: "",
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "rich_text_test",
			type: "rich-text",
			details: {
				label: text.admin("fields.rich-text.rich_text_test.label", {
					defaultMessage: "Rich Text Test",
				}),
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				localized: true,
				default: {
					type: "doc",
					content: [{ type: "paragraph" }],
				},
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "number_test",
			type: "number",
			details: {
				label: text.admin("fields.number.number_test.label", {
					defaultMessage: "Number Test",
				}),
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				localized: false,
				default: undefined,
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "checkbox_test",
			type: "checkbox",
			details: {
				label: text.admin("fields.checkbox.checkbox_test.label", {
					defaultMessage: "Checkbox Test",
				}),
				summary: undefined,
				true: undefined,
				false: undefined,
			},
			config: {
				localized: false,
				default: false,
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "select_test",
			type: "select",
			details: {
				label: text.admin("fields.select.select_test.label", {
					defaultMessage: "Select Test",
				}),
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				localized: false,
				default: "",
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
				label: text.admin("fields.json.json_test.label", {
					defaultMessage: "Json Test",
				}),
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				localized: false,
				default: {},
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "color_test",
			type: "color",
			details: {
				label: text.admin("fields.color.color_test.label", {
					defaultMessage: "Color Test",
				}),
				summary: undefined,
			},
			presets: [],
			config: {
				localized: false,
				default: "",
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "media_test",
			type: "media",
			details: {
				label: text.admin("fields.media.media_test.label", {
					defaultMessage: "Media Test",
				}),
				summary: undefined,
			},
			config: {
				localized: false,
				default: [],
				hidden: undefined,
				disabled: undefined,
				multiple: undefined,
			},
			validation: undefined,
		},
		{
			key: "datetime_test",
			type: "datetime",
			details: {
				label: text.admin("fields.datetime.datetime_test.label", {
					defaultMessage: "Datetime Test",
				}),
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				localized: false,
				time: false,
				default: "",
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "link_test",
			type: "link",
			details: {
				label: text.admin("fields.link.link_test.label", {
					defaultMessage: "Link Test",
				}),
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				localized: false,
				default: {
					url: null,
					label: null,
					target: null,
				},
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "user_test",
			type: "user",
			details: {
				label: text.admin("fields.user.user_test.label", {
					defaultMessage: "User Test",
				}),
				summary: undefined,
			},
			config: {
				localized: false,
				default: [],
				hidden: undefined,
				disabled: undefined,
				multiple: undefined,
			},

			validation: undefined,
		},
		{
			key: "repeater_test",
			type: "repeater",
			details: {
				label: text.admin("fields.repeater.repeater_test.label", {
					defaultMessage: "Repeater Test",
				}),
				summary: undefined,
			},
			config: {
				disabled: undefined,
			},
			fields: [],
			validation: undefined,
		},
		{
			key: "repeater_text_test",
			type: "text",
			details: {
				label: text.admin("fields.text.repeater_text_test.label", {
					defaultMessage: "Repeater Text Test",
				}),
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				localized: true,
				default: "",
				hidden: undefined,
				disabled: undefined,
			},
			validation: undefined,
		},
	]);
});

test("fieldTree memoization invalidates on add operations", async () => {
	const instance = new FieldBuilder().addText("text_test");

	const initialTree = instance.fieldTree;
	const cachedTree = instance.fieldTree;
	expect(cachedTree).toBe(initialTree);

	instance.addNumber("number_test");

	const updatedTree = instance.fieldTree;
	expect(updatedTree).not.toBe(initialTree);
	expect(updatedTree.length).toBe(2);
});

test("persistedFieldTree memoization invalidates on repeater mutation", async () => {
	const instance = new FieldBuilder()
		.addRepeater("repeater_test")
		.addText("text_test");

	const beforeEnd = instance.persistedFieldTree;
	expect(instance.persistedFieldTree).toBe(beforeEnd);

	instance.endRepeater();

	const afterEnd = instance.persistedFieldTree;
	expect(afterEnd).not.toBe(beforeEnd);

	const repeater = afterEnd[0];
	if (repeater?.type === "repeater") {
		expect(repeater.fields.length).toBe(1);
		expect(repeater.fields[0]?.key).toBe("text_test");
	}
});

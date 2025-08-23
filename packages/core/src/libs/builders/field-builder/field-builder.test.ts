import { expect, test } from "vitest";
import FieldBuilder from "./index.js";

test("all fields should be added", async () => {
	const instance = new FieldBuilder()
		.addText("text_test")
		.addTextarea("textarea_test")
		.addWysiwyg("wysiwyg_test")
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
	expect(instance.fields.get("wysiwyg_test")).toBeDefined();
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
		.addWysiwyg("wysiwyg_test")
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

	expect(instance.flatFields).toEqual([
		{
			key: "text_test",
			type: "text",
			details: {
				label: "Text Test",
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				useTranslations: true,
				default: "",
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "textarea_test",
			type: "textarea",
			details: {
				label: "Textarea Test",
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				useTranslations: true,
				default: "",
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "wysiwyg_test",
			type: "wysiwyg",
			details: {
				label: "Wysiwyg Test",
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				useTranslations: true,
				default: "",
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "number_test",
			type: "number",
			details: {
				label: "Number Test",
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				useTranslations: false,
				default: undefined,
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "checkbox_test",
			type: "checkbox",
			details: { label: "Checkbox Test", summary: undefined },
			config: {
				useTranslations: false,
				default: false,
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "select_test",
			type: "select",
			details: {
				label: "Select Test",
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				useTranslations: false,
				default: "",
				isHidden: undefined,
				isDisabled: undefined,
			},
			options: [],
			validation: undefined,
		},
		{
			key: "json_test",
			type: "json",
			details: {
				label: "Json Test",
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				useTranslations: false,
				default: {},
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "color_test",
			type: "color",
			details: { label: "Color Test", summary: undefined },
			presets: [],
			config: {
				useTranslations: false,
				default: "",
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "media_test",
			type: "media",
			details: { label: "Media Test", summary: undefined },
			config: {
				useTranslations: false,
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "datetime_test",
			type: "datetime",
			details: {
				label: "Datetime Test",
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				useTranslations: false,
				default: "",
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "link_test",
			type: "link",
			details: {
				label: "Link Test",
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				useTranslations: false,
				default: {
					url: null,
					label: null,
					target: null,
				},
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
		{
			key: "user_test",
			type: "user",
			details: { label: "User Test", summary: undefined },
			config: {
				useTranslations: false,
				isHidden: undefined,
				isDisabled: undefined,
			},

			validation: undefined,
		},
		{
			key: "repeater_test",
			type: "repeater",
			details: { label: "Repeater Test", summary: undefined },
			config: {
				isDisabled: undefined,
			},
			fields: [],
			validation: undefined,
		},
		{
			key: "repeater_text_test",
			type: "text",
			details: {
				label: "Repeater Text Test",
				summary: undefined,
				placeholder: undefined,
			},
			config: {
				useTranslations: true,
				default: "",
				isHidden: undefined,
				isDisabled: undefined,
			},
			validation: undefined,
		},
	]);
});

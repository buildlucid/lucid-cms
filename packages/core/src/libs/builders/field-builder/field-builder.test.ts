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
		.addColour("colour_test")
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
	expect(instance.fields.get("colour_test")).toBeDefined();
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
		.addColour("colour_test")
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
			labels: {
				title: "Text Test",
				description: undefined,
				placeholder: undefined,
			},
			useTranslations: true,
			default: "",
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "textarea_test",
			type: "textarea",
			labels: {
				title: "Textarea Test",
				description: undefined,
				placeholder: undefined,
			},
			useTranslations: true,
			default: "",
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "wysiwyg_test",
			type: "wysiwyg",
			labels: {
				title: "Wysiwyg Test",
				description: undefined,
				placeholder: undefined,
			},
			useTranslations: true,
			default: "",
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "number_test",
			type: "number",
			labels: {
				title: "Number Test",
				description: undefined,
				placeholder: undefined,
			},
			useTranslations: false,
			default: undefined,
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "checkbox_test",
			type: "checkbox",
			labels: { title: "Checkbox Test", description: undefined },
			useTranslations: false,
			default: 0,
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "select_test",
			type: "select",
			labels: {
				title: "Select Test",
				description: undefined,
				placeholder: undefined,
			},
			useTranslations: false,
			default: "",
			options: [],
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "json_test",
			type: "json",
			labels: {
				title: "Json Test",
				description: undefined,
				placeholder: undefined,
			},
			useTranslations: false,
			default: undefined,
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "colour_test",
			type: "colour",
			labels: { title: "Colour Test", description: undefined },
			presets: [],
			useTranslations: false,
			default: "",
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "media_test",
			type: "media",
			labels: { title: "Media Test", description: undefined },
			useTranslations: false,
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "datetime_test",
			type: "datetime",
			labels: {
				title: "Datetime Test",
				description: undefined,
				placeholder: undefined,
			},
			useTranslations: false,
			default: "",
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "link_test",
			type: "link",
			labels: {
				title: "Link Test",
				description: undefined,
				placeholder: undefined,
			},
			useTranslations: false,
			default: {
				url: null,
				label: null,
				target: null,
			},
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "user_test",
			type: "user",
			labels: { title: "User Test", description: undefined },
			useTranslations: false,
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
		{
			key: "repeater_test",
			type: "repeater",
			labels: { title: "Repeater Test", description: undefined },
			disabled: undefined,
			fields: [],
			validation: undefined,
		},
		{
			key: "repeater_text_test",
			type: "text",
			labels: {
				title: "Repeater Text Test",
				description: undefined,
				placeholder: undefined,
			},
			useTranslations: true,
			default: "",
			hidden: undefined,
			disabled: undefined,
			validation: undefined,
		},
	]);
});

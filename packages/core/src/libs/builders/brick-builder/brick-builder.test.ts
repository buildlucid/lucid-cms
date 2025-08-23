import { expect, test } from "vitest";
import BrickBuilder from "./index.js";
import FieldBuilder from "../field-builder/index.js";

test("all brick fields are added", async () => {
	const brick = new BrickBuilder("brick")
		.addText("text_test")
		.addTextarea("textarea_test")
		.addNumber("number_test")
		.addCheckbox("checkbox_test")
		.addSelect("select_test")
		.addDateTime("datetime_test")
		.addUser("user_test")
		.addMedia("media_test")
		.addWysiwyg("wysiwyg_test")
		.addLink("link_test")
		.addJSON("json_test")
		.addColor("color_test")
		.addRepeater("repeater_test")
		.addText("repeater_text_test")
		.endRepeater();

	expect(brick.fields.size).toBe(14);
});

test("brick addFields custom field is working", async () => {
	const childBrickBuilder = new BrickBuilder("child_brick").addText(
		"brick_child_text",
	);
	const childFieldBuilder = new FieldBuilder().addText("field_child_text");
	const baseBrick = new BrickBuilder("brick")
		.addText("text_test")
		.addFields(childBrickBuilder)
		.addFields(childFieldBuilder);

	expect(baseBrick.fields.size).toBe(3);
});

test("tab fields are added and nesting is correct", async () => {
	const brick = new BrickBuilder("brick")
		.addTab("content_tab")
		.addText("text_test")
		.addTab("repeater_tab")
		.addCheckbox("checkbox_test");

	expect(brick.fields.size).toBe(4);
	expect(brick.fieldTreeNoTab.length).toBe(2);

	const firstTab = brick.fieldTree[0];
	if (firstTab?.type === "tab") {
		expect(firstTab.fields.length).toBe(1);
		expect(firstTab.fields[0]?.key).toBe("text_test");
	}

	const secondTab = brick.fieldTree[1];
	if (secondTab?.type === "tab") {
		expect(secondTab.fields.length).toBe(1);
		expect(secondTab.fields[0]?.key).toBe("checkbox_test");
	}
});

test("brick config is correct", async () => {
	const brick = new BrickBuilder("brick", {
		details: {
			name: "Brick",
			summary: "Brick Summary",
		},
		preview: {
			image: "https://placehold.co/600x400",
		},
	}).addText("text_test");

	expect(brick.config).toEqual({
		key: "brick",
		details: {
			name: "Brick",
			summary: "Brick Summary",
		},
		preview: { image: "https://placehold.co/600x400" },
	});
});

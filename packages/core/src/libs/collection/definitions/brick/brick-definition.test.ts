import { expect, test } from "vitest";
import { copy } from "../../../i18n/index.js";
import defineBrick from "../../define-brick.js";
import field from "../fields/field.js";
import { getFieldSetState } from "../fields/index.js";

test("all brick fields are added", async () => {
	const brick = defineBrick({
		key: "brick",
		fields: [
			field.text("text_test"),
			field.textarea("textarea_test"),
			field.number("number_test"),
			field.range("range_test"),
			field.checkbox("checkbox_test"),
			field.select("select_test"),
			field.datetime("datetime_test"),
			field.user("user_test"),
			field.media("media_test"),
			field.richText("rich_text_test"),
			field.link("link_test"),
			field.json("json_test"),
			field.color("color_test"),
			field.repeater("repeater_test", {
				fields: [field.text("repeater_text_test")],
			}),
		],
	});
	expect(getFieldSetState(brick).fields.size).toBe(15);
});

test("shared field groups are spread into a brick", async () => {
	const sharedFields = [field.text("shared_text")];
	const baseBrick = defineBrick({
		key: "brick",
		fields: [field.text("text_test"), ...sharedFields],
	});
	const otherBrick = defineBrick({ key: "other", fields: sharedFields });

	expect(getFieldSetState(baseBrick).fields.size).toBe(2);
	//* each brick owns its field instances, so one group can go in many places
	expect(getFieldSetState(baseBrick).fields.get("shared_text")).not.toBe(
		getFieldSetState(otherBrick).fields.get("shared_text"),
	);
});

test("list and label settings are refused on brick fields", async () => {
	expect(() =>
		defineBrick({
			key: "brick",
			fields: [field.text("title", { showInList: true })],
		}),
	).toThrow('Field "title" on brick "brick"');
});

test("tab fields are added and nesting is correct", async () => {
	const brick = defineBrick({
		key: "brick",
		fields: [
			field.tab("content_tab", { fields: [field.text("text_test")] }),
			field.tab("repeater_tab", { fields: [field.checkbox("checkbox_test")] }),
		],
	});
	expect(getFieldSetState(brick).fields.size).toBe(4);
	expect(brick.persistedFieldTree.length).toBe(2);

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
	const brick = defineBrick({
		key: "brick",
		details: {
			label: copy("admin:tests.bricks.brick.name", {
				defaultMessage: "Brick",
			}),
			description: copy("admin:tests.bricks.brick.summary", {
				defaultMessage: "Brick Summary",
			}),
		},
		thumbnail: "https://placehold.co/600x400",
		fields: [field.text("text_test")],
	});

	expect(brick.config).toEqual({
		key: "brick",
		details: {
			label: copy("admin:tests.bricks.brick.name", {
				defaultMessage: "Brick",
			}),
			description: copy("admin:tests.bricks.brick.summary", {
				defaultMessage: "Brick Summary",
			}),
		},
		thumbnail: "https://placehold.co/600x400",
	});
});

test("field tree cache invalidates when fields are inserted", async () => {
	const brick = defineBrick({
		key: "brick",
		fields: [field.text("text_test")],
	});

	const initialTree = brick.fieldTree;
	expect(brick.fieldTree).toEqual(initialTree);
	brick.insertFields([field.tab("content_tab", { fields: [] })]);
	const afterTabTree = brick.fieldTree;
	expect(afterTabTree).not.toEqual(initialTree);

	brick.insertFields([field.text("child_text")], {
		at: "end",
		tab: "content_tab",
	});
	const contentTab = brick.fieldTree[1];
	expect(
		contentTab?.type === "tab" && contentTab.fields.map((f) => f.key),
	).toEqual(["child_text"]);
});

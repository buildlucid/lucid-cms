import { copy, defineBrick, field } from "@lucidcms/core";

const TestingBrick = defineBrick({
	key: "testing",
	thumbnail:
		"https://usersnap.com/blog/wp-content/uploads/2021/03/7-Common-Types-of-Software-Testing@1x-1280x720.png",
	permissions: { update: true },
	fields: [
		field.tab("content_tab", {
			details: {
				label: copy("admin:bricks.testing.tabs.content_tab.label"),
			},
			fields: [
				field.text("text-key", {
					details: {
						label: copy("admin:bricks.testing.fields.text-key.label"),
						description: copy("admin:bricks.testing.fields.text-key.summary"),
						placeholder: copy(
							"admin:bricks.testing.fields.text-key.placeholder",
						),
					},
				}),
				field.richText("rich-text-key"),
				field.media("media-key", {
					validation: {
						extensions: ["png"],
						type: "image",
					},
				}),
				field.repeater("repeater-key", {
					fields: [
						field.text("repeater-title"),
						field.repeater("repeater-key-nested", {
							fields: [field.text("repeater-title-nested")],
						}),
					],
				}),
				field.number("number-key"),
				field.checkbox("checkbox-key", {
					details: {
						label: copy("admin:bricks.testing.fields.checkbox-key.label"),
						true: copy("admin:bricks.testing.fields.checkbox-key.trueLabel"),
						false: copy("admin:bricks.testing.fields.checkbox-key.falseLabel"),
					},
				}),
				field.select("select-key", {
					options: [
						{
							label: copy(
								"admin:bricks.testing.fields.select-key.options.option-1.label",
							),
							value: "option-1",
						},
						{
							label: copy(
								"admin:bricks.testing.fields.select-key.options.option-2.label",
							),
							value: "option-2",
						},
						{
							label: copy(
								"admin:bricks.testing.fields.select-key.options.option-3.label",
							),
							value: "option-3",
						},
					],
					validation: {
						required: true,
					},
				}),
				field.textarea("textarea-key", {
					details: {
						label: copy("admin:bricks.testing.fields.textarea-key.label"),
						placeholder: copy(
							"admin:bricks.testing.fields.textarea-key.placeholder",
						),
						description: copy(
							"admin:bricks.testing.fields.textarea-key.summary",
						),
					},
				}),
			],
		}),
		field.tab("advanced_tab", {
			details: {
				label: copy("admin:bricks.testing.tabs.advanced_tab.label"),
			},
			fields: [
				field.json("json-key"),
				field.code("code-key", {
					details: {
						label: copy("admin:bricks.testing.fields.code-key.label"),
						description: copy("admin:bricks.testing.fields.code-key.summary"),
						placeholder: copy(
							"admin:bricks.testing.fields.code-key.placeholder",
						),
					},
				}),
				field.code("code-key-restricted", {
					languages: ["javascript", "typescript", "css"],
					validation: {
						required: true,
					},
				}),
				field.color("color-key", {
					presets: ["#000000", "#ffffff"],
				}),
				field.datetime("datetime-key"),
				field.link("link-key"),
			],
		}),
	],
});

export default TestingBrick;

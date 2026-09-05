import { BrickBuilder, copy } from "@lucidcms/core";

const TestingBrick = new BrickBuilder("testing", {
	preview: {
		image:
			"https://usersnap.com/blog/wp-content/uploads/2021/03/7-Common-Types-of-Software-Testing@1x-1280x720.png",
	},
})
	.addTab("content_tab", {
		details: {
			label: copy("admin:bricks.testing.tabs.content_tab.label"),
		},
	})
	.addText("text-key", {
		details: {
			label: copy("admin:bricks.testing.fields.text-key.label"),
			summary: copy("admin:bricks.testing.fields.text-key.summary"),
			placeholder: copy("admin:bricks.testing.fields.text-key.placeholder"),
		},
	})
	.addRichText("rich-text-key")
	.addMedia("media-key", {
		validation: {
			extensions: ["png"],
			type: "image",
		},
	})
	.addRepeater("repeater-key")
	.addText("repeater-title")
	.addRepeater("repeater-key-nested")
	.addText("repeater-title-nested")
	.endRepeater()
	.endRepeater()
	.addNumber("number-key")
	.addCheckbox("checkbox-key", {
		details: {
			label: copy("admin:bricks.testing.fields.checkbox-key.label"),
			true: copy("admin:bricks.testing.fields.checkbox-key.trueLabel"),
			false: copy("admin:bricks.testing.fields.checkbox-key.falseLabel"),
		},
	})
	.addSelect("select-key", {
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
	})
	.addTextarea("textarea-key", {
		details: {
			label: copy("admin:bricks.testing.fields.textarea-key.label"),
			placeholder: copy("admin:bricks.testing.fields.textarea-key.placeholder"),
			summary: copy("admin:bricks.testing.fields.textarea-key.summary"),
		},
	})
	.addTab("advanced_tab", {
		details: {
			label: copy("admin:bricks.testing.tabs.advanced_tab.label"),
		},
	})
	.addJSON("json-key")
	.addCode("code-key", {
		details: {
			label: copy("admin:bricks.testing.fields.code-key.label"),
			summary: copy("admin:bricks.testing.fields.code-key.summary"),
			placeholder: copy("admin:bricks.testing.fields.code-key.placeholder"),
		},
	})
	.addCode("code-key-restricted", {
		languages: ["javascript", "typescript", "css"],
		validation: {
			required: true,
		},
	})
	.addColor("color-key", {
		presets: ["#000000", "#ffffff"],
	})
	.addDateTime("datetime-key")
	.addLink("link-key");

export default TestingBrick;

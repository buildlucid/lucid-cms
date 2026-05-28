import { adminText, BrickBuilder } from "@lucidcms/core";

const TestingBrick = new BrickBuilder("testing", {
	preview: {
		image:
			"https://usersnap.com/blog/wp-content/uploads/2021/03/7-Common-Types-of-Software-Testing@1x-1280x720.png",
	},
})
	.addTab("content_tab", {
		details: {
			label: adminText("bricks.testing.tabs.content_tab.label", {
				fallback: "Content",
			}),
		},
	})
	.addText("text-key", {
		details: {
			label: adminText("bricks.testing.fields.text-key.label", {
				fallback: "Text",
			}),
			summary: adminText("bricks.testing.fields.text-key.summary", {
				fallback: "Testing title",
			}),
			placeholder: adminText("bricks.testing.fields.text-key.placeholder", {
				fallback: "Testing title",
			}),
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
			label: adminText("bricks.testing.fields.checkbox-key.label", {
				fallback: "Checkbox",
			}),
			true: adminText("bricks.testing.fields.checkbox-key.trueLabel", {
				fallback: "Show",
			}),
			false: adminText("bricks.testing.fields.checkbox-key.falseLabel", {
				fallback: "Hide",
			}),
		},
	})
	.addSelect("select-key", {
		options: [
			{
				label: adminText(
					"bricks.testing.fields.select-key.options.option-1.label",
					{ fallback: "Option 1" },
				),
				value: "option-1",
			},
			{
				label: adminText(
					"bricks.testing.fields.select-key.options.option-2.label",
					{ fallback: "Option 2" },
				),
				value: "option-2",
			},
			{
				label: adminText(
					"bricks.testing.fields.select-key.options.option-3.label",
					{ fallback: "Option 3" },
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
			label: adminText("bricks.testing.fields.textarea-key.label", {
				fallback: "Textarea",
			}),
			placeholder: adminText("bricks.testing.fields.textarea-key.placeholder", {
				fallback: "Testing textarea",
			}),
			summary: adminText("bricks.testing.fields.textarea-key.summary", {
				fallback: "Testing textarea",
			}),
		},
	})
	.addTab("advanced_tab", {
		details: {
			label: adminText("bricks.testing.tabs.advanced_tab.label", {
				fallback: "Advanced",
			}),
		},
	})
	.addJSON("json-key")
	.addColor("color-key", {
		presets: ["#000000", "#ffffff"],
	})
	.addDateTime("datetime-key")
	.addLink("link-key");

export default TestingBrick;

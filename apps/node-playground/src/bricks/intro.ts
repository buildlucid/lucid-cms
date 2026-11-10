import { copy, defineBrick, field } from "@lucidcms/core";

const IntroBrick = defineBrick({
	key: "intro",
	details: {
		label: copy("admin:bricks.intro.name"),
	},
	fields: [
		field.tab("content_tab", {
			details: {
				label: copy("admin:bricks.intro.tabs.content_tab.label"),
			},
			fields: [
				field.text("title", {
					localized: true,
				}),
				field.richText("intro", {
					editor: {
						media: true,
					},
					validation: {
						required: true,
					},
				}),
				field.media("intro_audio", {
					details: {
						label: "Audio",
					},
					validation: {
						type: "audio",
					},
					permissions: { read: true },
				}),
			],
		}),
		field.tab("advanced_tab", {
			details: {
				label: copy("admin:bricks.intro.tabs.advanced_tab.label"),
			},
			fields: [
				field.json("json", {
					details: {
						label: copy("admin:bricks.intro.fields.json.label"),
					},
					validation: {
						required: true,
					},
				}),
			],
		}),
	],
});

export default IntroBrick;

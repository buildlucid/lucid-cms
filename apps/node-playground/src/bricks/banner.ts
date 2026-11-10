import { copy, defineBrick, field } from "@lucidcms/core";

const BannerBrick = defineBrick({
	key: "banner",
	details: {
		label: copy("admin:bricks.banner.name"),
		description: copy("admin:bricks.banner.summary"),
	},
	thumbnail: "https://headless-dev.up.railway.app/public/banner-brick.png",
	fields: [
		field.tab("content_tab", {
			details: {
				label: copy("admin:bricks.banner.tabs.content_tab.label"),
			},
			fields: [
				field.text("title", {
					details: {
						description: copy("admin:bricks.banner.fields.title.summary"),
					},
					default: "Welcome to our website",
					validation: {
						required: true,
					},
				}),
				field.richText("intro"),
				field.repeater("call_to_actions", {
					details: {
						label: copy("admin:bricks.banner.fields.call_to_actions.label"),
					},
					validation: {
						maxGroups: 3,
					},
					permissions: { update: true },
					fields: [
						field.text("call_to_action_title", {
							details: {
								label: copy(
									"admin:bricks.banner.fields.call_to_action_title.label",
								),
							},
						}),
						field.link("link", {
							details: {
								label: copy("admin:bricks.banner.fields.link.label"),
							},
						}),
						field.repeater("nested_repeater", {
							fields: [field.text("nested_title")],
						}),
					],
				}),
			],
		}),
		field.tab("config_tab", {
			details: {
				label: copy("admin:bricks.banner.tabs.config_tab.label"),
			},
			permissions: { update: true },
			fields: [
				field.checkbox("full_width", {
					details: {
						description: copy("admin:bricks.banner.fields.full_width.summary"),
					},
				}),
			],
		}),
	],
});

export default BannerBrick;

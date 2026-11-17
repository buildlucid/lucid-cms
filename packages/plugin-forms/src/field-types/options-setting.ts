import { copy, field } from "@lucidcms/core";
import type { ContentFieldNode } from "@lucidcms/core/types";

/** The builder repeater choice fields share: each choice's label, and the value stored for it. */
const optionsSetting = (): ContentFieldNode =>
	field.repeater("options", {
		details: {
			label: copy("admin:plugin.forms.settings.options.label"),
		},
		validation: { minGroups: 1 },
		fields: [
			field.text("label", {
				details: {
					label: copy("admin:plugin.forms.settings.options.item.label"),
				},
				localized: true,
				validation: { required: true },
				ui: { width: 6 },
			}),
			field.text("value", {
				details: {
					label: copy("admin:plugin.forms.settings.options.item.value"),
					description: copy(
						"admin:plugin.forms.settings.options.item.value.description",
					),
				},
				localized: false,
				validation: { required: true },
				ui: { width: 6 },
			}),
		],
	});

export default optionsSetting;

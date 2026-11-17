import { copy, field } from "@lucidcms/core";
import type { ContentFieldNode } from "@lucidcms/core/types";

/** The builder field text types share for the most characters an answer may have, half a row wide when it has a neighbour. */
const maxLengthSetting = (width: 6 | 12): ContentFieldNode =>
	field.number("maxLength", {
		details: {
			label: copy("admin:plugin.forms.settings.max.length.label"),
		},
		ui: { width },
	});

export default maxLengthSetting;

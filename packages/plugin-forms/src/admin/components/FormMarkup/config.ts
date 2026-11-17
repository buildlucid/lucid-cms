import { defineAdminSlot } from "@lucidcms/core";
import {
	COMPONENTS_MODULE,
	FORMS_COLLECTION_KEY,
	FORMS_READ_PERMISSION,
	PLUGIN_KEY,
} from "../../../constants.js";

/** Adds a button to a form's preview toolbar that shows the markup websites get, and how to send it. */
const formMarkupConfig = () =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:markup`,
		slot: "document.previewToolbar",
		match: { collection: FORMS_COLLECTION_KEY },
		permission: [FORMS_READ_PERMISSION],
		component: { module: COMPONENTS_MODULE, export: "FormMarkup" },
	});

export default formMarkupConfig;

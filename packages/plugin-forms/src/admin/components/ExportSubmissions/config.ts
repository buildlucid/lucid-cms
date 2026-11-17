import { defineAdminSlot } from "@lucidcms/core";
import {
	COMPONENTS_MODULE,
	PLUGIN_KEY,
	SUBMISSIONS_READ_PERMISSION,
} from "../../../constants.js";

/**
 * Adds a section for exporting a form's submissions to the sidebar of a collection's documents, above their details:
 * forms, and submissions themselves, which is where code-defined forms' are reached. `field` is
 * the field holding the form's key there.
 */
const exportSubmissionsConfig = (collection: string, field: string) =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:${collection}:export-submissions`,
		slot: "document.sidebar",
		match: { collection },
		position: { before: "details" },
		permission: [SUBMISSIONS_READ_PERMISSION],
		component: { module: COMPONENTS_MODULE, export: "ExportSubmissions" },
		options: { field },
	});

export default exportSubmissionsConfig;

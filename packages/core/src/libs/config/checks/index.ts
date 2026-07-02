import checkCollectionEnvironmentRelations from "./check-collection-environment-relations.js";
import checkDuplicateBuilderKeys from "./check-duplicate-builder-keys.js";
import checkDuplicateFieldKeys from "./check-duplicate-field-keys.js";
import checkField from "./check-field.js";
import checkFieldConditions from "./check-field-conditions.js";
import checkLocales from "./check-locales.js";
import checkPluginVersion from "./check-plugin-version.js";
import checkRepeaterDepth from "./check-repeater-depth.js";
import checkTenants from "./check-tenants.js";

export default {
	checkDuplicateBuilderKeys,
	checkDuplicateFieldKeys,
	checkCollectionEnvironmentRelations,
	checkRepeaterDepth,
	checkPluginVersion,
	checkLocales,
	checkField,
	checkFieldConditions,
	checkTenants,
};

import checkCollectionEnvironmentVersionMap from "./check-collection-environment-version-map.js";
import checkDuplicateBuilderKeys from "./check-duplicate-builder-keys.js";
import checkDuplicateFieldKeys from "./check-duplicate-field-keys.js";
import checkField from "./check-field.js";
import checkFieldConditions from "./check-field-conditions.js";
import checkLocales from "./check-locales.js";
import checkOpenRepeaters from "./check-open-repeaters.js";
import checkPluginVersion from "./check-plugin-version.js";
import checkRepeaterDepth from "./check-repeater-depth.js";
import checkTenants from "./check-tenants.js";

export default {
	checkDuplicateBuilderKeys,
	checkDuplicateFieldKeys,
	checkCollectionEnvironmentVersionMap,
	checkOpenRepeaters,
	checkRepeaterDepth,
	checkPluginVersion,
	checkLocales,
	checkField,
	checkFieldConditions,
	checkTenants,
};

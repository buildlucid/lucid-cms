import checks from "./checks/index.js";
import inviteSingle from "./invite-single.js";
import createInitialAdmin from "./create-initial-admin.js";
import getSingle from "./get-single.js";
import getMultiple from "./get-multiple.js";
import deleteSingle from "./delete-single.js";
import deleteSinglePermanently from "./delete-single-permanently.js";
import updateMultipleRoles from "./update-multiple-roles.js";
import updateSingle from "./update-single.js";
import getMultipleFieldMeta from "./get-multiple-field-meta.js";
import restoreMultiple from "./restore-multiple.js";

export default {
	checks,
	inviteSingle,
	createInitialAdmin,
	getSingle,
	getMultiple,
	deleteSingle,
	deleteSinglePermanently,
	updateMultipleRoles,
	updateSingle,
	getMultipleFieldMeta,
	restoreMultiple,
};

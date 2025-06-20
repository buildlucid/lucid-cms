import checks from "./checks/index.js";
import sendEmail from "./send-email.js";
import getMultiple from "./get-multiple.js";
import getSingle from "./get-single.js";
import deleteSingle from "./delete-single.js";
import resendSingle from "./resend-single.js";
import sendExternal from "./send-external.js";

export default {
	checks,
	sendEmail,
	getMultiple,
	getSingle,
	deleteSingle,
	resendSingle,
	sendExternal,
};

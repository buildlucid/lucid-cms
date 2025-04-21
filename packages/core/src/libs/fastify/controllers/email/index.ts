import getMultiple from "./get-multiple.js";
import getSingle from "./get-single.js";
import deleteSingle from "./delete-single.js";
import resendSingle from "./resend-single.js";

interface EmailRouteControllers {
	getMultiple: typeof getMultiple;
	getSingle: typeof getSingle;
	deleteSingle: typeof deleteSingle;
	resendSingle: typeof resendSingle;
}

const controllers: EmailRouteControllers = {
	getMultiple,
	getSingle,
	deleteSingle,
	resendSingle,
};

export default controllers;

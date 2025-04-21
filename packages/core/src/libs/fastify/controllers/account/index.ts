import updateMe from "./update-me.js";
import getMe from "./get-me.js";
import sendResetPassword from "./send-reset-password.js";
import verifyResetPassword from "./verify-reset-password.js";
import resetPassword from "./reset-password.js";

interface AccountRouteControllers {
	updateMe: typeof updateMe;
	getMe: typeof getMe;
	sendResetPassword: typeof sendResetPassword;
	verifyResetPassword: typeof verifyResetPassword;
	resetPassword: typeof resetPassword;
}

const controllers: AccountRouteControllers = {
	updateMe,
	getMe,
	sendResetPassword,
	verifyResetPassword,
	resetPassword,
};

export default controllers;

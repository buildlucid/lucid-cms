import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY, redirectStatuses } from "../../constants.js";
import { type RedirectStatus, SiteRedirectError } from "../../errors.js";

const isRedirectStatus = (status: number): status is RedirectStatus =>
	redirectStatuses.some((item) => item === status);

const redirect = (location: string, status = 302): never => {
	if (!isRedirectStatus(status)) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `redirect() takes a status of ${redirectStatuses.join(", ")}, not ${status}.`,
		});
	}
	throw new SiteRedirectError(location, status);
};

export default redirect;

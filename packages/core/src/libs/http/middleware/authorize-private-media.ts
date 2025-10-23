import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import T from "../../../translations/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import getKeyVisibility from "../../../utils/media/get-key-visibility.js";
import { authenticationCheck } from "./authenticate.js";

/**
 * Determines if a private media request should proceed
 *
 * @todo Add support for team and user specific private media
 */
const authorizePrivateMedia = createMiddleware(
	async (c: LucidHonoContext, next) => {
		const { key } = c.req.param();

		//* try and use this middleware after the validate params one in the controller so this isnt ever hit - validation middleware will have nicer error messages
		if (!key) {
			throw new LucidAPIError({
				type: "validation",
				message: T("validation_error_message"),
			});
		}

		const keyVisibility = getKeyVisibility(key);
		if (keyVisibility === constants.media.visibilityKeys.private) {
			await authenticationCheck(c);
		}

		return await next();
	},
);

export default authorizePrivateMedia;

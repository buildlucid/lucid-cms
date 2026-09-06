import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import {
	getKeyVisibility,
	normalizeMediaKey,
} from "../../../utils/media/index.js";
import { copy } from "../../i18n/index.js";
import { authenticationCheck } from "./authenticate.js";

/**
 * Requires admin authentication for private media keys. Public keys pass through.
 * Register after validation of the route's key parameter.
 */
const authorizePrivateMedia = createMiddleware(
	async (c: LucidHonoContext, next) => {
		const { key } = c.req.param();

		//* try and use this middleware after the validate params one in the controller so this isnt ever hit - validation middleware will have nicer error messages
		if (!key) {
			throw new LucidAPIError({
				type: "validation",
				message: copy("server:core.errors.validation.message"),
			});
		}

		const normalizedKey = normalizeMediaKey(key);
		const keyVisibility = getKeyVisibility(normalizedKey);

		if (keyVisibility === constants.media.visibilityKeys.private) {
			await authenticationCheck(c);
		}

		return await next();
	},
);

export default authorizePrivateMedia;

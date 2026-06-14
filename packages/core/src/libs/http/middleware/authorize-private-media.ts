import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { multiTenancyEnabled } from "../../../utils/helpers/index.js";
import {
	getKeyVisibility,
	getMediaKeyTenantKey,
	normalizeMediaKey,
} from "../../../utils/media/index.js";
import { copy } from "../../i18n/index.js";
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
				message: copy("server:core.errors.validation.message"),
			});
		}

		const normalizedKey = normalizeMediaKey(key);
		const keyVisibility = getKeyVisibility(normalizedKey);

		if (keyVisibility === constants.media.visibilityKeys.private) {
			await authenticationCheck(c);

			const tenantKey = getMediaKeyTenantKey(normalizedKey);
			const auth = c.get("auth");
			if (
				tenantKey &&
				multiTenancyEnabled(c.get("config")) &&
				!auth.superAdmin &&
				!auth.tenantKeys.includes(tenantKey)
			) {
				throw new LucidAPIError({
					type: "authorisation",
					message: copy("server:core.tenants.no.access"),
					status: 403,
				});
			}
		}

		return await next();
	},
);

export default authorizePrivateMedia;

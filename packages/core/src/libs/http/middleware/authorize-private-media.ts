import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import {
	canAccessMedia,
	getKeyVisibility,
	getMediaOwnership,
	normalizeMediaKey,
} from "../../../utils/media/index.js";
import { copy } from "../../i18n/index.js";
import { MediaRepository } from "../../repositories/index.js";
import { authenticationCheck } from "./authenticate.js";

/**
 * Requires admin authentication for private media keys. Public keys pass through.
 * Personal and system media is also checked against who is asking, so only its
 * owner, or holders of `media:read-all`, can stream it.
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

			const Media = new MediaRepository(c.get("db"));
			const mediaRes = await Media.selectSingle({
				select: ["owner_user_id", "is_system"],
				where: [{ key: "key", operator: "=", value: normalizedKey }],
			});
			if (mediaRes.error) throw new LucidAPIError(mediaRes.error);

			if (
				mediaRes.data &&
				!canAccessMedia({
					actor: { type: "user", user: c.get("auth") },
					ownership: getMediaOwnership(mediaRes.data),
					action: "read",
				})
			) {
				throw new LucidAPIError({
					type: "basic",
					name: copy("server:core.media.not.found.name"),
					message: copy("server:core.media.not.found.message"),
					status: 404,
				});
			}
		}

		return await next();
	},
);

export default authorizePrivateMedia;

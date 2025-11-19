import { randomUUID } from "node:crypto";
import { createFactory } from "hono/factory";
import { setCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { describeRoute } from "hono-openapi";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/share.js";
import { mediaShareLinkServices } from "../../../../services/index.js";
import createAuthCookieName from "../../../../utils/share-link/auth-cookie.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import validate from "../../middleware/validate.js";

const factory = createFactory();

/**
 * Authorize access to a password-protected share link by validating the provided password
 * and setting a session cookie if valid.
 */
const authorizeStreamController = factory.createHandlers(
	describeRoute({
		description: "Validate share password and set a session cookie.",
		tags: ["share"],
		summary: "Authorize Stream",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.authorizeStream.params,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.authorizeStream.body),
		validateResponse: false,
	}),
	validate("param", controllerSchemas.authorizeStream.params),
	validate("json", controllerSchemas.authorizeStream.body),
	async (c) => {
		const { token } = c.req.valid("param");
		const { password } = c.req.valid("json");

		const authorizeRes = await serviceWrapper(
			mediaShareLinkServices.authorizeShare,
			{ transaction: false },
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{ token, providedPassword: password },
		);
		if (authorizeRes.error) {
			const status = (authorizeRes.error.status || 401) as ContentfulStatusCode;
			return c.json(
				{
					error: authorizeRes.error.message,
					...(authorizeRes.error.name && { name: authorizeRes.error.name }),
				},
				status,
			);
		}

		const cookieName = createAuthCookieName(token);
		setCookie(c, cookieName, randomUUID(), {
			maxAge: constants.shareLinkExpiration,
			httpOnly: true,
			secure: c.req.url.startsWith("https://"),
			sameSite: "strict",
			path: "/share",
		});

		return c.json({ success: true }, 200);
	},
);

export default authorizeStreamController;

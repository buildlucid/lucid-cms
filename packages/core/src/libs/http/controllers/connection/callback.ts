import { deleteCookie, getCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { parseConnectionCallbackParameters } from "../../../../services/connection/helpers/callback-parameters.js";
import { getConnectionFlowCookieName } from "../../../../services/connection/helpers/flow-security.js";
import { connectionServices } from "../../../../services/index.js";
import type { LucidHonoGeneric } from "../../../../types/hono.js";
import { getBaseUrl } from "../../../../utils/helpers/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory<LucidHonoGeneric>();

const callbackController = factory.createHandlers(
	describeRoute({
		description:
			"Consumes a single-use OAuth callback and redirects to Integrations settings.",
		tags: ["connection"],
		summary: "Lucid OAuth Callback",
		responses: openAPI.responses(),
	}),
	async (c) => {
		const context = createServiceContext(c);
		const callbackUrl = new URL(c.req.url);
		const parameters = parseConnectionCallbackParameters(callbackUrl);
		const flowCookieName = getConnectionFlowCookieName(
			context,
			parameters.state,
		);
		const result = await serviceWrapper(connectionServices.callback, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.failed"),
			},
		})(context, {
			state: parameters.state,
			issuer: parameters.issuer,
			code: parameters.code,
			error: parameters.error,
			browserBinding: getCookie(c, flowCookieName),
			parametersValid: parameters.valid,
		});

		deleteCookie(c, flowCookieName, {
			path: "/lucid/api/v1/connection/callback",
		});

		c.header("Cache-Control", "private, no-store");
		c.header("Pragma", "no-cache");
		c.header("Referrer-Policy", "no-referrer");
		c.header("X-Robots-Tag", "noindex, nofollow");

		if (result.error) {
			const fallback = new URL(
				"/lucid/system/integrations",
				getBaseUrl(context),
			);
			fallback.searchParams.set("result", "failed");
			fallback.searchParams.set("error", "authorization_failed");
			return c.redirect(fallback.toString(), 303);
		}

		return c.redirect(result.data.location, 303);
	},
);

export default callbackController;

import crypto from "node:crypto";
import { setCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/connection.js";
import {
	getConnectionFlowCookieName,
	getConnectionFlowCookieOptions,
} from "../../../../services/connection/helpers/flow-security.js";
import { getConnectionUrls } from "../../../../services/connection/helpers/urls.js";
import { connectionServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const connectController = factory.createHandlers(
	describeRoute({
		description:
			"Creates or reuses a confidential OAuth client and starts authorization.",
		tags: ["connection"],
		summary: "Connect to Lucid",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.connect.response),
		}),
		parameters: openAPI.parameters({
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.ConnectionUpdate]),
	async (c) => {
		const context = createServiceContext(c);
		const browserBinding = crypto.randomBytes(32).toString("base64url");

		const result = await serviceWrapper(connectionServices.connect, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.failed"),
			},
		})(context, { browserBinding });
		if (result.error) throw new LucidAPIError(result.error);

		const callbackUrl = new URL(getConnectionUrls(context).callbackUrl);
		const state = new URL(result.data.authorizationUrl).searchParams.get(
			"state",
		);
		if (!state) {
			throw new LucidAPIError({
				type: "basic",
				status: 500,
				message: copy("server:core.connection.failed"),
			});
		}
		setCookie(
			c,
			getConnectionFlowCookieName(context, state),
			browserBinding,
			getConnectionFlowCookieOptions(callbackUrl.toString()),
		);

		c.header("Cache-Control", "private, no-store");
		c.header("Pragma", "no-cache");
		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default connectController;

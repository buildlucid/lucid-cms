import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { oauthClientSchemas } from "../../../../../schemas/oauth-clients.js";
import { oauthClientServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../../permission/definitions.js";
import authenticate from "../../../middleware/authenticate.js";
import permissions from "../../../middleware/permissions.js";
import validate from "../../../middleware/validate.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const updateLogoUploadSessionController = factory.createHandlers(
	describeRoute({
		description: "Creates an upload session for an existing OAuth client logo.",
		tags: ["integrations"],
		summary: "Create OAuth Client Logo Update Session",
		responses: openAPI.responses({
			schema: z.toJSONSchema(
				oauthClientSchemas.createLogoUploadSession.response,
			),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: oauthClientSchemas.getSingle.params,
		}),
		requestBody: openAPI.requestBody(
			oauthClientSchemas.createLogoUploadSession.body,
		),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.IntegrationUpdate]),
	validate("param", oauthClientSchemas.getSingle.params),
	validate("json", oauthClientSchemas.createLogoUploadSession.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const uploadRes = await serviceWrapper(
			oauthClientServices.updateLogoUploadSession,
			{
				transaction: false,
				defaultError: {
					type: "basic",
				},
			},
		)(context, {
			...body,
			id,
			userId: c.get("auth").id,
		});
		if (uploadRes.error) throw new LucidAPIError(uploadRes.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: uploadRes.data }));
	},
);

export default updateLogoUploadSessionController;

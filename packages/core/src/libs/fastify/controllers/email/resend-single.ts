import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/email.js";
import { headers, response } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const resendSingleController: RouteController<
	typeof controllerSchemas.resendSingle.params,
	typeof controllerSchemas.resendSingle.body,
	typeof controllerSchemas.resendSingle.query.string,
	typeof controllerSchemas.resendSingle.query.formatted
> = async (request, reply) => {
	const emailRes = await serviceWrapper(
		request.server.services.email.resendSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_email_resend_error_name"),
				message: T("route_email_resend_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			id: Number.parseInt(request.params.id, 10),
		},
	);
	if (emailRes.error) throw new LucidAPIError(emailRes.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: emailRes.data,
		}),
	);
};

export default {
	controller: resendSingleController,
	zodSchema: controllerSchemas.resendSingle,
	swaggerSchema: {
		description: "Resends the email with the given ID.",
		tags: ["emails"],
		summary: "Resend Email",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(controllerSchemas.resendSingle.query.string),
		// body: z.toJSONSchema(controllerSchemas.resendSingle.body),
		params: z.toJSONSchema(controllerSchemas.resendSingle.params),
		response: response({
			schema: z.toJSONSchema(controllerSchemas.resendSingle.response),
		}),
	},
};

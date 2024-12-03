import T from "../../translations/index.js";
import emailsSchema from "../../schemas/email.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const resendSingleController: RouteController<
	typeof emailsSchema.resendSingle.params,
	typeof emailsSchema.resendSingle.body,
	typeof emailsSchema.resendSingle.query
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
	zodSchema: emailsSchema.resendSingle,
	swaggerSchema: {
		description: "Resends the email with the given ID",
		tags: ["emails"],
		summary: "Resend email",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "object",
					properties: {
						success: {
							type: "boolean",
						},
						message: {
							type: "string",
						},
					},
				},
			}),
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};

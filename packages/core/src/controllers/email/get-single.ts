import T from "../../translations/index.js";
import emailsSchema from "../../schemas/email.js";
import { swaggerResponse } from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import EmailsFormatter from "../../libs/formatters/emails.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getSingleController: RouteController<
	typeof emailsSchema.getSingle.params,
	typeof emailsSchema.getSingle.body,
	typeof emailsSchema.getSingle.query
> = async (request, reply) => {
	const email = await serviceWrapper(request.server.services.email.getSingle, {
		transaction: false,
		defaultError: {
			type: "basic",
			name: T("route_email_fetch_error_name"),
			message: T("route_email_fetch_error_message"),
		},
	})(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			id: Number.parseInt(request.params.id, 10),
			renderTemplate: true,
		},
	);
	if (email.error) throw new LucidAPIError(email.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: email.data,
		}),
	);
};

export default {
	controller: getSingleController,
	zodSchema: emailsSchema.getSingle,
	swaggerSchema: {
		description: "Returns a single email based on the the id.",
		tags: ["emails"],
		summary: "Get a single email",
		response: {
			200: swaggerResponse({
				type: 200,
				data: EmailsFormatter.swagger,
			}),
		},
	},
};

import T from "../../translations/index.js";
import emailsSchema from "../../schemas/email.js";
import {
	swaggerResponse,
	swaggerQueryString,
} from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import EmailsFormatter from "../../libs/formatters/emails.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getMultipleController: RouteController<
	typeof emailsSchema.getMultiple.params,
	typeof emailsSchema.getMultiple.body,
	typeof emailsSchema.getMultiple.query
> = async (request, reply) => {
	const emails = await serviceWrapper(
		request.server.services.email.getMultiple,
		{
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_email_fetch_error_name"),
				message: T("route_email_fetch_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			query: request.query,
		},
	);
	if (emails.error) throw new LucidAPIError(emails.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: emails.data.data,
			pagination: {
				count: emails.data.count,
				page: request.query.page,
				perPage: request.query.perPage,
			},
		}),
	);
};

export default {
	controller: getMultipleController,
	zodSchema: emailsSchema.getMultiple,
	swaggerSchema: {
		description: "Returns multiple emails based on the query parameters.",
		tags: ["emails"],
		summary: "Get multiple emails",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "array",
					items: EmailsFormatter.swagger,
				},
				paginated: true,
			}),
		},
		querystring: swaggerQueryString({
			filters: [
				{
					key: "toAddress",
				},
				{
					key: "subject",
				},
				{
					key: "deliveryStatus",
					enum: ["sent", "failed", "pending"],
				},
				{
					key: "type",
					enum: ["internal", "external"],
				},
				{
					key: "template",
				},
			],
			sorts: ["sentCount", "createdAt", "updatedAt"],
			page: true,
			perPage: true,
		}),
	},
};

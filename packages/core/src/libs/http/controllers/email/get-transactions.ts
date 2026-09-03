import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/email.js";
import { emailServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getTransactionsController = factory.createHandlers(
	describeRoute({
		description: "Returns the delivery transactions recorded for one email.",
		tags: ["emails"],
		summary: "Get Email Transactions",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getTransactions.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getTransactions.query.string,
			params: controllerSchemas.getTransactions.params,
		}),
	}),
	authenticate(),
	permissions([Permissions.EmailRead]),
	validate("query", controllerSchemas.getTransactions.query.string),
	validate("param", controllerSchemas.getTransactions.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getTransactions.query.formatted,
			{ nullableFields: ["message", "externalMessageId"] },
		);
		const context = createServiceContext(c);

		const transactions = await serviceWrapper(emailServices.getTransactions, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.email.fetch.error.name"),
				message: copy("server:core.routes.email.fetch.error.message"),
			},
		})(context, {
			emailId: Number.parseInt(id, 10),
			query: formattedQuery,
		});
		if (transactions.error) throw new LucidAPIError(transactions.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: transactions.data.data,
				pagination: {
					count: transactions.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getTransactionsController;

import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/releases.js";
import { releaseServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const publishController = factory.createHandlers(
	describeRoute({
		description:
			"Queue publication of every document in an approved release. Poll the release execution endpoint for completion.",
		tags: ["releases"],
		summary: "Publish Release",
		responses: openAPI.responses({
			status: 202,
			dataSchema: z.toJSONSchema(controllerSchemas.publish.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.publish.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.ReleasesRead]),
	validate("param", controllerSchemas.publish.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const result = await serviceWrapper(releaseServices.publish, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.releases.error.name"),
				message: copy("server:core.routes.releases.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			user: c.get("auth"),
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(202);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default publishController;

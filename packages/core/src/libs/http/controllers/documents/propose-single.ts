import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const proposeSingleController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Propose changes to a document's latest content in a new or open update request. Latest only changes once the request is approved and completed.",
		tags: ["documents"],
		summary: "Propose Document Changes",
		responses: openAPI.responses({
			status: 201,
			dataSchema: z.toJSONSchema(controllerSchemas.proposeSingle.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.proposeSingle.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.proposeSingle.params,
			headers: {
				csrf: true,
			},
		}),
	})),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.proposeSingle.body),
	validate("param", controllerSchemas.proposeSingle.params),
	collectionPermissions("read"),
	async (c) => {
		const body = c.req.valid("json");
		const { collectionKey, id } = c.req.valid("param");
		const context = createServiceContext(c);

		const result = await serviceWrapper(documentServices.proposeSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.propose.error.name"),
				message: copy("server:core.routes.document.propose.error.message"),
			},
		})(context, {
			collectionKey,
			documentId: Number.parseInt(id, 10),
			user: c.get("auth"),
			request: body.request,
			bricks: body.bricks,
			fields: body.fields,
			baseContentId: body.baseContentId,
		});
		if (result.error) throw new LucidError(result.error);

		c.status(201);
		return c.json(
			formatAPIResponse(c, {
				data: {
					requestId: result.data.requestId,
					versionId: result.data.version.versionId,
					contentId: result.data.version.contentId,
				},
			}),
		);
	},
);

export default proposeSingleController;

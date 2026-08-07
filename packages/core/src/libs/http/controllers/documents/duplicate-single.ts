import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const duplicateSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Create a new document from the persisted latest version of a source document.",
		tags: ["documents"],
		summary: "Duplicate Document",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.duplicateSingle.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.duplicateSingle.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("param", controllerSchemas.duplicateSingle.params),
	collectionPermissions("read"),
	collectionPermissions("create"),
	async (c) => {
		const { collectionKey, id } = c.req.valid("param");
		const context = createServiceContext(c);

		const documentId = await serviceWrapper(documentServices.duplicateSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.duplicate.error.name"),
				message: copy("server:core.routes.document.duplicate.error.message"),
			},
		})(context, {
			collectionKey,
			documentId: Number.parseInt(id, 10),
			userId: c.get("auth").id,
		});
		if (documentId.error) throw new LucidAPIError(documentId.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: {
					id: documentId.data,
				},
			}),
		);
	},
);

export default duplicateSingleController;

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

const duplicateSingleController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Create a new document from the persisted latest version of a source document, or open a create request with the copy. Creating needs create, and requesting needs create or create-request.",
		tags: ["documents"],
		summary: "Duplicate Document",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.duplicateSingle.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.duplicateSingle.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.duplicateSingle.params,
			headers: {
				csrf: true,
			},
		}),
	})),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.duplicateSingle.body),
	validate("param", controllerSchemas.duplicateSingle.params),
	collectionPermissions("read"),
	async (c) => {
		const body = c.req.valid("json");
		const { collectionKey, id } = c.req.valid("param");
		const context = createServiceContext(c);

		const duplicated = await serviceWrapper(documentServices.duplicateSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.duplicate.error.name"),
				message: copy("server:core.routes.document.duplicate.error.message"),
			},
		})(context, {
			collectionKey,
			documentId: Number.parseInt(id, 10),
			user: c.get("auth"),
			request: body?.request,
		});
		if (duplicated.error) throw new LucidError(duplicated.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: duplicated.data }));
	},
);

export default duplicateSingleController;

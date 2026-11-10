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

const getEditorRefsController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Get display data for documents, media, users and emails an open editor links to but hasn't loaded. Items the user couldn't pick are left out.",
		tags: ["documents"],
		summary: "Get Editor Refs",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getEditorRefs.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.getEditorRefs.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.getEditorRefs.params,
			headers: {
				csrf: true,
			},
		}),
	})),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.getEditorRefs.body),
	validate("param", controllerSchemas.getEditorRefs.params),
	collectionPermissions("read"),
	async (c) => {
		const body = c.req.valid("json");
		const { collectionKey } = c.req.valid("param");
		const context = createServiceContext(c);

		const refsRes = await serviceWrapper(documentServices.getEditorRefs, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.fetch.error.name"),
				message: copy("server:core.routes.document.fetch.error.message"),
			},
		})(context, {
			collectionKey,
			user: c.get("auth"),
			documents: body.documents ?? [],
			media: body.media ?? [],
			users: body.users ?? [],
			emails: body.emails ?? [],
		});
		if (refsRes.error) throw new LucidError(refsRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: refsRes.data,
			}),
		);
	},
);

export default getEditorRefsController;

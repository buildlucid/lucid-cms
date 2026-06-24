import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentVersionServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const checkVersionController = factory.createHandlers(
	describeRoute({
		description:
			"Check a draft document version without persisting any changes.",
		tags: ["documents"],
		summary: "Check Document Version Draft",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.checkVersion.response),
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.checkVersion.body),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.checkVersion.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("json", controllerSchemas.checkVersion.body),
	validate("param", controllerSchemas.checkVersion.params),
	collectionPermissions("update"),
	async (c) => {
		const { bricks, fields } = c.req.valid("json");
		const { collectionKey, id, versionId } = c.req.valid("param");
		const context = createServiceContext(c);

		const checkRes = await serviceWrapper(documentVersionServices.checkSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.update.error.name"),
				message: copy("server:core.routes.document.update.error.message"),
			},
		})(context, {
			collectionKey,
			userId: c.get("auth").id,
			documentId: Number.parseInt(id, 10),
			versionId: Number.parseInt(versionId, 10),
			bricks,
			fields,
		});
		if (checkRes.error) throw new LucidAPIError(checkRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: checkRes.data,
			}),
		);
	},
);

export default checkVersionController;

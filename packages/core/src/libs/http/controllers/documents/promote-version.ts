import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { describeRoute } from "hono-openapi";
import { documentVersionServices } from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIRequestBody,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const promoteVersionController = factory.createHandlers(
	describeRoute({
		description: "Promote a document version to a new version type.",
		tags: ["documents"],
		summary: "Promote Document Version",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.promoteVersion.body),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.promoteVersion.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.PublishContent]),
	validate("json", controllerSchemas.promoteVersion.body),
	validate("param", controllerSchemas.promoteVersion.params),
	async (c) => {
		const { versionType } = c.req.valid("json");
		const { collectionKey, id, versionId } = c.req.valid("param");

		const restoreRevisionRes = await serviceWrapper(
			documentVersionServices.promoteVersion,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_document_promote_version_error_name"),
					message: T("route_document_promote_version_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				fromVersionId: Number.parseInt(versionId),
				userId: c.get("auth").id,
				documentId: Number.parseInt(id),
				collectionKey,
				toVersionType: versionType,
			},
		);
		if (restoreRevisionRes.error)
			throw new LucidAPIError(restoreRevisionRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default promoteVersionController;

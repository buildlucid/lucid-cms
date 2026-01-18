import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentVersionServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";

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
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.PublishContent]),
	validate("json", controllerSchemas.promoteVersion.body),
	validate("param", controllerSchemas.promoteVersion.params),
	async (c) => {
		const { versionType, bypassRevision } = c.req.valid("json");
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
				db: c.get("config").db,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				fromVersionId: Number.parseInt(versionId, 10),
				userId: c.get("auth").id,
				documentId: Number.parseInt(id, 10),
				collectionKey,
				toVersionType: versionType,
				createRevision: bypassRevision === true ? false : undefined,
			},
		);
		if (restoreRevisionRes.error)
			throw new LucidAPIError(restoreRevisionRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default promoteVersionController;

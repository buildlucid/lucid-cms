import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/media-folders.js";
import { mediaFolderServices } from "../../../../services/index.js";
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
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description: "Creates a single media folder.",
		tags: ["media-folders"],
		summary: "Create Media",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.createSingle.body),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.CreateMedia]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = getServiceContext(c);

		const mediaFolderIdRes = await serviceWrapper(
			mediaFolderServices.createSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_media_folders_create_error_name"),
					message: T("route_media_folders_create_error_message"),
				},
			},
		)(context, {
			title: body.title,
			parentFolderId: body.parentFolderId,
			userId: c.get("auth").id,
		});
		if (mediaFolderIdRes.error) throw new LucidAPIError(mediaFolderIdRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default createSingleController;

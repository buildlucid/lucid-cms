import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/media.js";
import { mediaServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const updateSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Update a single media entry with translations and new upload.",
		tags: ["media"],
		summary: "Update Media",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.updateSingle.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.updateSingle.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UpdateMedia]),
	validate("param", controllerSchemas.updateSingle.params),
	validate("json", controllerSchemas.updateSingle.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");

		const updateMedia = await serviceWrapper(mediaServices.updateSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_update_error_name"),
				message: T("route_media_update_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				id: Number.parseInt(id, 10),
				fileName: body.fileName,
				key: body.key,
				public: body.public,
				folderId: body.folderId,
				title: body.title,
				alt: body.alt,
				width: body.width,
				height: body.height,
				blurHash: body.blurHash,
				averageColor: body.averageColor,
				isDark: body.isDark,
				isLight: body.isLight,
				isDeleted: body.isDeleted,
				userId: c.get("auth").id,
			},
		);
		if (updateMedia.error) throw new LucidAPIError(updateMedia.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateSingleController;

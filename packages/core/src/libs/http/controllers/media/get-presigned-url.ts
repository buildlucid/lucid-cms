import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod/v4";
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
import formatAPIResponse from "../../utils/build-response.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const getPresignedUrlController = factory.createHandlers(
	describeRoute({
		description: "Get a presigned URL to upload a single media item.",
		tags: ["media"],
		summary: "Get Presigned URL",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getPresignedUrl.response),
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.getPresignedUrl.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.CreateMedia, Permissions.UpdateMedia]),
	validate("json", controllerSchemas.getPresignedUrl.body),
	async (c) => {
		const body = c.req.valid("json");

		const presignedUrl = await serviceWrapper(mediaServices.getPresignedUrl, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_media_presigned_url_error_name"),
				message: T("route_media_presigned_url_error_message"),
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
				fileName: body.fileName,
				mimeType: body.mimeType,
				public: body.public,
			},
		);
		if (presignedUrl.error) throw new LucidAPIError(presignedUrl.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: presignedUrl.data,
			}),
		);
	},
);

export default getPresignedUrlController;

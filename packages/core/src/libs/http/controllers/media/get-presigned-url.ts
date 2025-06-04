import z from "zod";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/media.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoSwaggerResponse,
	honoSwaggerParamaters,
	honoSwaggerRequestBody,
} from "../../../../utils/swagger/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";

const factory = createFactory();

const getPresignedUrlController = factory.createHandlers(
	describeRoute({
		description: "Get a presigned URL to upload a single media item.",
		tags: ["media"],
		summary: "Get Presigned URL",
		responses: honoSwaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getPresignedUrl.response),
		}),
		parameters: honoSwaggerParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoSwaggerRequestBody(controllerSchemas.getPresignedUrl.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions(["create_media", "update_media"]),
	validate("json", controllerSchemas.getPresignedUrl.body),
	async (c) => {
		const body = c.req.valid("json");

		const presignedUrl = await serviceWrapper(services.media.getPresignedUrl, {
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
				services: services,
			},
			{
				fileName: body.fileName,
				mimeType: body.mimeType,
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

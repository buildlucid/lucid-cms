import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
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
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const getUploadPartUrlsController = factory.createHandlers(
	describeRoute({
		description: "Get upload URLs for resumable upload parts.",
		tags: ["media"],
		summary: "Get Upload Part URLs",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getUploadPartUrls.response),
		}),
		parameters: honoOpenAPIParamaters({
			headers: { csrf: true },
			params: controllerSchemas.getUploadPartUrls.params,
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.getUploadPartUrls.body,
		),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.MediaCreate, Permissions.MediaUpdate]),
	validate("param", controllerSchemas.getUploadPartUrls.params),
	validate("json", controllerSchemas.getUploadPartUrls.body),
	async (c) => {
		const params = c.req.valid("param");
		const body = c.req.valid("json");
		const context = getServiceContext(c);

		const urls = await serviceWrapper(mediaServices.getUploadPartUrls, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_media_upload_session_error_name"),
				message: T("route_media_upload_session_error_message"),
			},
		})(context, {
			sessionId: params.sessionId,
			partNumbers: body.partNumbers,
		});
		if (urls.error) throw new LucidAPIError(urls.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: urls.data }));
	},
);

export default getUploadPartUrlsController;

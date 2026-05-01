import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/media.js";
import { mediaServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getUploadSessionController = factory.createHandlers(
	describeRoute({
		description: "Get resumable upload session state.",
		tags: ["media"],
		summary: "Get Upload Session",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getUploadSession.response),
		}),
		parameters: honoOpenAPIParamaters({
			headers: { csrf: true },
			params: controllerSchemas.getUploadSession.params,
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.MediaCreate, Permissions.MediaUpdate]),
	validate("param", controllerSchemas.getUploadSession.params),
	async (c) => {
		const params = c.req.valid("param");
		const context = createServiceContext(c);

		const uploadSession = await serviceWrapper(mediaServices.getUploadSession, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_media_upload_session_error_name"),
				message: T("route_media_upload_session_error_message"),
			},
		})(context, {
			sessionId: params.sessionId,
		});
		if (uploadSession.error) throw new LucidAPIError(uploadSession.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: uploadSession.data }));
	},
);

export default getUploadSessionController;

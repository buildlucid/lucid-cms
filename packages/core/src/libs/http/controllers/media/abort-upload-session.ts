import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/media.js";
import { mediaServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIParamaters } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const abortUploadSessionController = factory.createHandlers(
	describeRoute({
		description: "Abort a resumable upload session.",
		tags: ["media"],
		summary: "Abort Upload Session",
		parameters: honoOpenAPIParamaters({
			headers: { csrf: true },
			params: controllerSchemas.abortUploadSession.params,
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.MediaCreate, Permissions.MediaUpdate]),
	validate("param", controllerSchemas.abortUploadSession.params),
	async (c) => {
		const params = c.req.valid("param");
		const context = createServiceContext(c);

		const aborted = await serviceWrapper(mediaServices.abortUploadSession, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_upload_session_error_name"),
				message: T("route_media_upload_session_error_message"),
			},
		})(context, {
			sessionId: params.sessionId,
		});
		if (aborted.error) throw new LucidAPIError(aborted.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: aborted.data }));
	},
);

export default abortUploadSessionController;

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
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const completeUploadSessionController = factory.createHandlers(
	describeRoute({
		description: "Complete a resumable upload session.",
		tags: ["media"],
		summary: "Complete Upload Session",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.completeUploadSession.response),
		}),
		parameters: honoOpenAPIParamaters({
			headers: { csrf: true },
			params: controllerSchemas.completeUploadSession.params,
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.completeUploadSession.body,
		),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.MediaCreate, Permissions.MediaUpdate]),
	validate("param", controllerSchemas.completeUploadSession.params),
	validate("json", controllerSchemas.completeUploadSession.body),
	async (c) => {
		const params = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const completed = await serviceWrapper(
			mediaServices.completeUploadSession,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_media_upload_session_error_name"),
					message: T("route_media_upload_session_error_message"),
				},
			},
		)(context, {
			sessionId: params.sessionId,
			parts: body.parts,
		});
		if (completed.error) throw new LucidAPIError(completed.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: completed.data }));
	},
);

export default completeUploadSessionController;

import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/account.js";
import { accountServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const createProfilePictureUploadSessionController = factory.createHandlers(
	describeRoute({
		description:
			"Create an upload session for the authenticated user's profile picture.",
		tags: ["account"],
		summary: "Create Profile Picture Upload Session",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(
				controllerSchemas.createProfilePictureUploadSession.response,
			),
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.createProfilePictureUploadSession.body,
		),
	}),
	validateCSRF,
	authenticate,
	validate("json", controllerSchemas.createProfilePictureUploadSession.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const uploadSession = await serviceWrapper(
			accountServices.createProfilePictureUploadSession,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_profile_picture_upload_session_error_name"),
					message: T("route_profile_picture_upload_session_error_message"),
				},
			},
		)(context, {
			fileName: body.fileName,
			mimeType: body.mimeType,
			size: body.size,
			userId: c.get("auth").id,
		});
		if (uploadSession.error) throw new LucidAPIError(uploadSession.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: uploadSession.data,
			}),
		);
	},
);

export default createProfilePictureUploadSessionController;

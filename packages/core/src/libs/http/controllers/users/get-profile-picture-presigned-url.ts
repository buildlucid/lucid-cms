import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/users.js";
import { accountServices } from "../../../../services/index.js";
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

const getProfilePicturePresignedUrlController = factory.createHandlers(
	describeRoute({
		description: "Get a presigned URL to upload a user's profile picture.",
		tags: ["users"],
		summary: "Get User Profile Picture Presigned URL",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(
				controllerSchemas.getProfilePicturePresignedUrl.response,
			),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getProfilePicturePresignedUrl.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.getProfilePicturePresignedUrl.body,
		),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UsersUpdate]),
	validate("param", controllerSchemas.getProfilePicturePresignedUrl.params),
	validate("json", controllerSchemas.getProfilePicturePresignedUrl.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = getServiceContext(c);

		const presignedUrl = await serviceWrapper(
			accountServices.getProfilePicturePresignedUrl,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_user_profile_picture_presigned_url_error_name"),
					message: T("route_user_profile_picture_presigned_url_error_message"),
				},
			},
		)(context, {
			fileName: body.fileName,
			mimeType: body.mimeType,
		});
		if (presignedUrl.error) throw new LucidAPIError(presignedUrl.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: presignedUrl.data,
			}),
		);
	},
);

export default getProfilePicturePresignedUrlController;

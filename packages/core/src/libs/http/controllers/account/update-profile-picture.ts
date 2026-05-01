import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
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
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateProfilePictureController = factory.createHandlers(
	describeRoute({
		description: "Update the authenticated user's profile picture.",
		tags: ["account"],
		summary: "Update Profile Picture",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.updateProfilePicture.body,
		),
	}),
	validateCSRF,
	authenticate,
	validate("json", controllerSchemas.updateProfilePicture.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const updateProfilePicture = await serviceWrapper(
			accountServices.updateProfilePicture,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_profile_picture_update_error_name"),
					message: T("route_profile_picture_update_error_message"),
				},
			},
		)(context, {
			targetUserId: c.get("auth").id,
			actorUserId: c.get("auth").id,
			allowSelf: true,
			key: body.key,
			fileName: body.fileName,
			width: body.width,
			height: body.height,
			focalPoint: body.focalPoint,
			blurHash: body.blurHash,
			averageColor: body.averageColor,
			base64: body.base64,
			isDark: body.isDark,
			isLight: body.isLight,
			title: body.title,
			alt: body.alt,
		});
		if (updateProfilePicture.error) {
			throw new LucidAPIError(updateProfilePicture.error);
		}

		c.status(204);
		return c.body(null);
	},
);

export default updateProfilePictureController;

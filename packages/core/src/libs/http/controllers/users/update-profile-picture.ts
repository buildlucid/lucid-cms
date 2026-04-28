import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
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
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const updateProfilePictureController = factory.createHandlers(
	describeRoute({
		description: "Update a user's profile picture.",
		tags: ["users"],
		summary: "Update User Profile Picture",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.updateProfilePicture.params,
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
	permissions([Permissions.UsersUpdate]),
	validate("param", controllerSchemas.updateProfilePicture.params),
	validate("json", controllerSchemas.updateProfilePicture.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = getServiceContext(c);

		const updateProfilePicture = await serviceWrapper(
			accountServices.updateProfilePicture,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_user_profile_picture_update_error_name"),
					message: T("route_user_profile_picture_update_error_message"),
				},
			},
		)(context, {
			targetUserId: Number.parseInt(id, 10),
			actorUserId: c.get("auth").id,
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

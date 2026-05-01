import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/users.js";
import { accountServices } from "../../../../services/index.js";
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
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const deleteProfilePictureController = factory.createHandlers(
	describeRoute({
		description: "Delete a user's profile picture.",
		tags: ["users"],
		summary: "Delete User Profile Picture",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.deleteProfilePicture.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UsersUpdate]),
	validate("param", controllerSchemas.deleteProfilePicture.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const deleteProfilePicture = await serviceWrapper(
			accountServices.deleteProfilePicture,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_user_profile_picture_delete_error_name"),
					message: T("route_user_profile_picture_delete_error_message"),
				},
			},
		)(context, {
			targetUserId: Number.parseInt(id, 10),
			actorUserId: c.get("auth").id,
		});
		if (deleteProfilePicture.error) {
			throw new LucidAPIError(deleteProfilePicture.error);
		}

		c.status(204);
		return c.body(null);
	},
);

export default deleteProfilePictureController;

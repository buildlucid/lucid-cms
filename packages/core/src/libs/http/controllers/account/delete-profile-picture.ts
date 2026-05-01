import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { accountServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const deleteProfilePictureController = factory.createHandlers(
	describeRoute({
		description: "Delete the authenticated user's profile picture.",
		tags: ["account"],
		summary: "Delete Profile Picture",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	async (c) => {
		const context = createServiceContext(c);

		const deleteProfilePicture = await serviceWrapper(
			accountServices.deleteProfilePicture,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_profile_picture_delete_error_name"),
					message: T("route_profile_picture_delete_error_message"),
				},
			},
		)(context, {
			targetUserId: c.get("auth").id,
			actorUserId: c.get("auth").id,
			allowSelf: true,
		});
		if (deleteProfilePicture.error) {
			throw new LucidAPIError(deleteProfilePicture.error);
		}

		c.status(204);
		return c.body(null);
	},
);

export default deleteProfilePictureController;

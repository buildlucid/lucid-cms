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
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Get a single media item by ID.",
		tags: ["media"],
		summary: "Get Media",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getSingle.params,
		}),
	}),
	authenticate,
	validate("param", controllerSchemas.getSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = getServiceContext(c);

		const media = await serviceWrapper(mediaServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_media_fetch_error_name"),
				message: T("route_media_fetch_error_message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
		});
		if (media.error) throw new LucidAPIError(media.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: media.data,
			}),
		);
	},
);

export default getSingleController;

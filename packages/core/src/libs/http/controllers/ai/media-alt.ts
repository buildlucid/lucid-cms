import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import {
	controllerSchemas,
	type MediaAltBody,
} from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import { permissionCheck } from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const mediaAltController = factory.createHandlers(
	describeRoute({
		description: "Generate alt text for media using Lucid AI.",
		tags: ["ai"],
		summary: "Generate Media Alt Text",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.mediaAlt.response),
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.mediaAlt.body),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	validate("json", controllerSchemas.mediaAlt.body),
	async (c) => {
		const body = c.req.valid("json") as MediaAltBody;
		permissionCheck(
			c,
			body.media.id === undefined
				? Permissions.MediaCreate
				: Permissions.MediaUpdate,
		);
		const context = createServiceContext(c);

		const generateRes = await serviceWrapper(aiServices.mediaAlt, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.generate.error.name"),
				message: copy("server:core.routes.ai.generate.error.message"),
			},
		})(context, {
			image: body.image,
			media: body.media,
			locale: body.locale,
		});
		if (generateRes.error) throw new LucidAPIError(generateRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: generateRes.data,
			}),
		);
	},
);

export default mediaAltController;

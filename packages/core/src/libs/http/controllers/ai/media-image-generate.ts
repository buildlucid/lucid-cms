import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import constants from "../../../../constants/constants.js";
import {
	controllerSchemas,
	type MediaImageGenerateBody,
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
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const mediaImageGenerateController = factory.createHandlers(
	describeRoute({
		description: "Generate a media image using Lucid AI.",
		tags: ["ai"],
		summary: "Generate Media Image",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.mediaImageGenerate.response),
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.mediaImageGenerate.body,
		),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
				idempotencyKey: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.AiImageGenerate]),
	validate("json", controllerSchemas.mediaImageGenerate.body),
	async (c) => {
		const body = c.req.valid("json") as MediaImageGenerateBody;
		const context = createServiceContext(c);

		const generateRes = await serviceWrapper(aiServices.mediaImageGenerate, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.generate.error.name"),
				message: copy("server:core.routes.ai.generate.error.message"),
			},
		})(context, {
			instruction: body.instruction,
			guidance: body.guidance,
			previousInstructions: body.previousInstructions,
			image: body.image,
			generation: body.generation,
			idempotencyKey: c.req.header(constants.headers.idempotencyKey),
			userId: c.get("auth").id,
		});
		if (generateRes.error) throw new LucidAPIError(generateRes.error);

		c.status(202);
		return c.json(
			formatAPIResponse(c, {
				data: generateRes.data,
			}),
		);
	},
);

export default mediaImageGenerateController;

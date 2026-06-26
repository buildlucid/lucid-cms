import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const mediaImageCompletionController = factory.createHandlers(
	describeRoute({
		description: "Check a Lucid AI media image generation request.",
		tags: ["ai"],
		summary: "Check Media Image Generation",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.mediaImageCompletion.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.mediaImageCompletion.params,
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.AiImageGenerate]),
	validate("param", controllerSchemas.mediaImageCompletion.params),
	async (c) => {
		const params = c.req.valid("param");
		const context = createServiceContext(c);

		const completionRes = await serviceWrapper(
			aiServices.mediaImageCompletion,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.ai.generate.error.name"),
					message: copy("server:core.routes.ai.generate.error.message"),
				},
			},
		)(context, {
			requestId: params.requestId,
		});
		if (completionRes.error) throw new LucidAPIError(completionRes.error);

		const isPending =
			"status" in completionRes.data &&
			(completionRes.data.status === "queued" ||
				completionRes.data.status === "processing");

		c.status(isPending ? 202 : 200);
		return c.json(
			formatAPIResponse(c, {
				data: completionRes.data,
			}),
		);
	},
);

export default mediaImageCompletionController;

import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/ai.js";
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

const customFieldInputGenerateController = factory.createHandlers(
	describeRoute({
		description: "Generate a value for a custom field using Lucid AI.",
		tags: ["ai"],
		summary: "Generate Custom Field Input",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.customFieldInput.response),
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.customFieldInput.body,
		),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.AiCustomFieldValue]),
	validate("json", controllerSchemas.customFieldInput.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const generateRes = await serviceWrapper(
			aiServices.customFieldInputGenerate,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.ai.generate.error.name"),
					message: copy("server:core.routes.ai.generate.error.message"),
				},
			},
		)(context, {
			instruction: body.instruction,
			guidance: body.guidance,
			currentValue: body.currentValue,
			target: body.target,
			locale: body.locale,
			userId: c.get("auth").id,
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

export default customFieldInputGenerateController;

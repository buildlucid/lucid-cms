import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import {
	type CustomFieldInputBody,
	controllerSchemas,
} from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const customFieldInputController = factory.createHandlers(
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
	validate("json", controllerSchemas.customFieldInput.body),
	collectionPermissions("ai", {
		getCollectionKey: (c) => {
			const request = c.req as {
				valid: (target: "json") => CustomFieldInputBody;
			};
			const body = request.valid("json");
			return body.target.collectionKey;
		},
	}),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const generateRes = await serviceWrapper(aiServices.customFieldInput, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_ai_generate_error_name"),
				message: T("route_ai_generate_error_message"),
			},
		})(context, {
			instruction: body.instruction,
			target: body.target,
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

export default customFieldInputController;

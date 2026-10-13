import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import constants from "../../../../constants/constants.js";
import {
	controllerSchemas,
	type MediaAudioGenerateBody,
} from "../../../../schemas/ai.js";
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

const mediaAudioGenerateController = factory.createHandlers(
	describeRoute({
		description:
			"Speak a script with Lucid AI text to speech. Poll the generation with the returned requestId until the audio is ready.",
		tags: ["ai"],
		summary: "Generate Media Audio",
		responses: openAPI.responses({
			status: 202,
			dataSchema: z.toJSONSchema(controllerSchemas.mediaAudioGenerate.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.mediaAudioGenerate.body),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
				idempotencyKey: true,
			},
		}),
	}),
	validateCSRF(),
	authenticate(),
	permissions([Permissions.AiAudioGenerate]),
	validate("json", controllerSchemas.mediaAudioGenerate.body),
	async (c) => {
		const body = c.req.valid("json") as MediaAudioGenerateBody;
		const context = createServiceContext(c);

		const generateRes = await serviceWrapper(aiServices.mediaAudioGenerate, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.generate.error.name"),
				message: copy("server:core.routes.ai.generate.error.message"),
			},
		})(context, {
			sessionId: body.sessionId,
			script: body.script,
			instruction: body.instruction,
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

export default mediaAudioGenerateController;

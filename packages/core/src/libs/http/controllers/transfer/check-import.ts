import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/transfer.js";
import { transferServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const checkImportController = factory.createHandlers(
	describeRoute({
		description:
			"Checks an export file without saving anything, returning each entry's planned outcome in the order to import them.",
		tags: ["transfer"],
		summary: "Check Import",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.checkImport.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.checkImport.body),
	}),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.checkImport.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const checkRes = await serviceWrapper(transferServices.checkImport, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.transfer.check.error.name"),
				message: copy("server:core.routes.transfer.check.error.message"),
			},
		})(context, {
			actor: { type: "user", userId: c.get("auth").id },
			file: body.file,
			mode: body.mode,
		});
		if (checkRes.error) throw new LucidAPIError(checkRes.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: checkRes.data }));
	},
);

export default checkImportController;

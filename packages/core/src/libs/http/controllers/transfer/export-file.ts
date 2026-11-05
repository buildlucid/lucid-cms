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

const exportFileController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Builds an export file from records you can read, with the media they link to. Bundled files are left to the client.",
		tags: ["transfer"],
		summary: "Export",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.exportFile.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.exportFile.body),
	})),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.exportFile.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const fileRes = await serviceWrapper(transferServices.exportFile, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.transfer.export.error.name"),
				message: copy("server:core.routes.transfer.export.error.message"),
			},
		})(context, {
			actor: { type: "user", userId: c.get("auth").id },
			select: body.select,
			linked: body.linked ?? false,
		});
		if (fileRes.error) throw new LucidAPIError(fileRes.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: fileRes.data }));
	},
);

export default exportFileController;

import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/transfer.js";
import { transferServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const importEntryController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Imports one entry from an export file. A failed entry is returned as its result, so imports can carry on with the rest.",
		tags: ["transfer"],
		summary: "Import Entry",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.importEntry.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.importEntry.body),
	})),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.importEntry.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);
		const upload = body.upload;

		//* entries save in their own transactions, and media uploads can't run in one
		const resultRes = await serviceWrapper(transferServices.importEntry, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.transfer.import.error.name"),
				message: copy("server:core.routes.transfer.import.error.message"),
			},
		})(context, {
			actor: { type: "user", userId: c.get("auth").id },
			source: body.source,
			resource: body.resource,
			entry: body.entry,
			mode: body.mode,
			pending: body.pending,
			final: body.final,
			file: upload
				? async () => ({ type: "upload", key: upload.key })
				: undefined,
			dryRun: false,
		});
		if (resultRes.error) throw new LucidError(resultRes.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: resultRes.data }));
	},
);

export default importEntryController;

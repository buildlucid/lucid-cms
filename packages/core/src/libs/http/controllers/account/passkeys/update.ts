import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../../schemas/account.js";
import { accountServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import authenticate from "../../../middleware/authenticate.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const updatePasskeyController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description: "Renames one of the authenticated user's passkeys.",
		tags: ["account"],
		summary: "Rename Passkey",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.updatePasskey.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updatePasskey.body),
	})),
	validateCSRF(),
	authenticate(),
	validate("param", controllerSchemas.updatePasskey.params),
	validate("json", controllerSchemas.updatePasskey.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const { name } = c.req.valid("json");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const updateRes = await serviceWrapper(accountServices.renamePasskey, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.passkeys.error.name"),
				message: copy("server:core.routes.passkeys.error.message"),
			},
		})(context, {
			userId: auth.id,
			passkeyId: Number.parseInt(id, 10),
			name: name,
		});
		if (updateRes.error) throw new LucidAPIError(updateRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default updatePasskeyController;

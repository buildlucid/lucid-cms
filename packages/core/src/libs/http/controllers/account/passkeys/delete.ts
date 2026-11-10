import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../../schemas/account.js";
import { accountServices } from "../../../../../services/index.js";
import { LucidError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import authenticate from "../../../middleware/authenticate.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const deletePasskeyController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Removes one of the authenticated user's passkeys, so it can no longer be used to sign in.",
		tags: ["account"],
		summary: "Remove Passkey",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.deletePasskey.params,
			headers: {
				csrf: true,
			},
		}),
	})),
	validateCSRF(),
	authenticate(),
	validate("param", controllerSchemas.deletePasskey.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const deleteRes = await serviceWrapper(accountServices.deletePasskey, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.passkeys.error.name"),
				message: copy("server:core.routes.passkeys.error.message"),
			},
		})(context, {
			userId: auth.id,
			superAdmin: auth.superAdmin,
			passkeyId: Number.parseInt(id, 10),
		});
		if (deleteRes.error) throw new LucidError(deleteRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default deletePasskeyController;

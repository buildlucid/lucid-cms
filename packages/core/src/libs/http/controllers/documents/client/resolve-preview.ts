import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/documents.js";
import { documentPreviewServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import { ClientScopes } from "../../../../permission/client-scopes.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import clientScopes from "../../../middleware/client-scopes.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const resolvePreviewController = factory.createHandlers(
	describeRoute({
		description: "Resolve an expiring document preview token.",
		tags: ["client-previews"],
		summary: "Resolve Document Preview",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.client.resolvePreview.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.client.resolvePreview.params,
			headers: { authorization: true },
		}),
	}),
	clientAuthentication,
	clientScopes([ClientScopes.DocumentsRead]),
	validate("param", controllerSchemas.client.resolvePreview.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = createServiceContext(c);
		const preview = await serviceWrapper(documentPreviewServices.resolve, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.fetch.error.name"),
				message: copy("server:core.routes.document.fetch.error.message"),
			},
		})(context, { token });
		if (preview.error) throw new LucidAPIError(preview.error);

		c.header("Cache-Control", "private, no-store");
		c.header("Pragma", "no-cache");
		c.status(200);
		return c.json(formatAPIResponse(c, { data: preview.data }));
	},
);

export default resolvePreviewController;

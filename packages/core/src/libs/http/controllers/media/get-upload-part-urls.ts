import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/media.js";
import { mediaServices } from "../../../../services/index.js";
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

const getUploadPartUrlsController = factory.createHandlers(
	describeRoute({
		description: "Get upload URLs for resumable upload parts.",
		tags: ["media"],
		summary: "Get Upload Part URLs",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getUploadPartUrls.response),
		}),
		parameters: openAPI.parameters({
			headers: { csrf: true },
			params: controllerSchemas.getUploadPartUrls.params,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.getUploadPartUrls.body),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.MediaCreate, Permissions.MediaUpdate]),
	validate("param", controllerSchemas.getUploadPartUrls.params),
	validate("json", controllerSchemas.getUploadPartUrls.body),
	async (c) => {
		const params = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const urls = await serviceWrapper(mediaServices.getUploadPartUrls, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.media.upload.session.error.name"),
				message: copy("server:core.routes.media.upload.session.error.message"),
			},
		})(context, {
			sessionId: params.sessionId,
			partNumbers: body.partNumbers,
		});
		if (urls.error) throw new LucidAPIError(urls.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: urls.data }));
	},
);

export default getUploadPartUrlsController;

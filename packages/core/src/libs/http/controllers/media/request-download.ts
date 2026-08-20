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

const requestDownloadController = factory.createHandlers(
	describeRoute({
		description: "Request a direct download URL for a media item.",
		tags: ["media"],
		summary: "Request Media Download URL",
		parameters: openAPI.parameters({
			params: controllerSchemas.requestDownload.params,
			headers: {
				csrf: true,
			},
		}),
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.requestDownload.response),
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.MediaRead]),
	validate("param", controllerSchemas.requestDownload.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const downloadRes = await serviceWrapper(mediaServices.requestDownload, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.media.download.error.name"),
				message: copy("server:core.routes.media.download.error.message"),
			},
		})(context, {
			target: {
				type: "id",
				id: Number.parseInt(id, 10),
			},
		});
		if (downloadRes.error) throw new LucidAPIError(downloadRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: {
					url: downloadRes.data.url,
				},
			}),
		);
	},
);

export default requestDownloadController;

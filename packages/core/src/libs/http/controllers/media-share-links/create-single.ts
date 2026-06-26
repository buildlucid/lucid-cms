import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/media-share-links.js";
import { mediaShareLinkServices } from "../../../../services/index.js";
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

const createSingleController = factory.createHandlers(
	describeRoute({
		description: "Create a media share link for a media item.",
		tags: ["media-share-links"],
		summary: "Create Media Share Link",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.createSingle.params,
			headers: { csrf: true },
		}),
		requestBody: openAPI.requestBody(controllerSchemas.createSingle.body),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.MediaCreate]),
	validate("param", controllerSchemas.createSingle.params),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const linkRes = await serviceWrapper(mediaShareLinkServices.createSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.media.share.links.create.error.name"),
				message: copy(
					"server:core.routes.media.share.links.create.error.message",
				),
			},
		})(context, {
			mediaId: Number.parseInt(id, 10),
			name: body.name,
			description: body.description,
			password: body.password,
			expiresAt: body.expiresAt,
			userId: c.get("auth").id,
		});
		if (linkRes.error) throw new LucidAPIError(linkRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: linkRes.data,
			}),
		);
	},
);

export default createSingleController;

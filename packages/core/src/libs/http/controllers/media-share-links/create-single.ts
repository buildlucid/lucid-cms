import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod/v4";
import { controllerSchemas } from "../../../../schemas/media-share-links.js";
import { mediaShareLinkServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description: "Create a media share link for a media item.",
		tags: ["media-share-links"],
		summary: "Create Media Share Link",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.createSingle.params,
			headers: { csrf: true },
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.createSingle.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.CreateMedia]),
	validate("param", controllerSchemas.createSingle.params),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");

		const linkRes = await serviceWrapper(mediaShareLinkServices.createSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_share_links_create_error_name"),
				message: T("route_media_share_links_create_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				mediaId: Number.parseInt(id, 10),
				name: body.name,
				description: body.description,
				password: body.password,
				expiresAt: body.expiresAt,
				userId: c.get("auth").id,
			},
		);
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

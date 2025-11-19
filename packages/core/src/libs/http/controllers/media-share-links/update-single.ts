import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
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
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const updateSingleController = factory.createHandlers(
	describeRoute({
		description: "Update a media share link.",
		tags: ["media-share-links"],
		summary: "Update Media Share Link",
		responses: honoOpenAPIResponse({ noProperties: true }),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.updateSingle.params,
			headers: { csrf: true },
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.updateSingle.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UpdateMedia]),
	validate("param", controllerSchemas.updateSingle.params),
	validate("json", controllerSchemas.updateSingle.body),
	async (c) => {
		const { id, linkId } = c.req.valid("param");
		const body = c.req.valid("json");

		const updateRes = await serviceWrapper(
			mediaShareLinkServices.updateSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_media_share_links_update_error_name"),
					message: T("route_media_share_links_update_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				mediaId: Number.parseInt(id, 10),
				linkId: Number.parseInt(linkId, 10),
				name: body.name,
				description: body.description,
				password: body.password,
				expiresAt: body.expiresAt,
				userId: c.get("auth").id,
			},
		);
		if (updateRes.error) throw new LucidAPIError(updateRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateSingleController;

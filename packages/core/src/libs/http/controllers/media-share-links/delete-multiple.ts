import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/media-share-links.js";
import { mediaShareLinkServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const deleteMultipleController = factory.createHandlers(
	describeRoute({
		description: "Delete all share links for a media item.",
		tags: ["media-share-links"],
		summary: "Delete All Media Share Links",
		responses: honoOpenAPIResponse({ noProperties: true }),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.deleteMultiple.params,
			headers: { csrf: true },
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.DeleteMedia]),
	validate("param", controllerSchemas.deleteMultiple.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const deleteRes = await serviceWrapper(
			mediaShareLinkServices.deleteMultiple,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_media_share_links_delete_all_error_name"),
					message: T("route_media_share_links_delete_all_error_message"),
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
			},
		);
		if (deleteRes.error) throw new LucidAPIError(deleteRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteMultipleController;

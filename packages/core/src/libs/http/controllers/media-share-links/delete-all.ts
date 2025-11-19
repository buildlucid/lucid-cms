import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { mediaShareLinkServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const deleteAllController = factory.createHandlers(
	describeRoute({
		description: "Delete all share links across the entire system.",
		tags: ["media-share-links"],
		summary: "Delete All Media Share Links",
		responses: honoOpenAPIResponse({ noProperties: true }),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.DeleteMedia]),
	async (c) => {
		const deleteRes = await serviceWrapper(mediaShareLinkServices.deleteAll, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_share_links_delete_all_system_error_name"),
				message: T("route_media_share_links_delete_all_system_error_message"),
			},
		})({
			db: c.get("config").db.client,
			config: c.get("config"),
			queue: c.get("queue"),
			env: c.get("env"),
			kv: c.get("kv"),
		});
		if (deleteRes.error) throw new LucidAPIError(deleteRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteAllController;

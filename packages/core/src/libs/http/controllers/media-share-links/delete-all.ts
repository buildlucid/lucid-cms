import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { mediaShareLinkServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const deleteAllController = factory.createHandlers(
	describeRoute({
		description: "Delete all share links across the entire system.",
		tags: ["media-share-links"],
		summary: "Delete All Media Share Links",
		responses: openAPI.responses({ noProperties: true }),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.MediaDelete]),
	async (c) => {
		const context = createServiceContext(c);

		const deleteRes = await serviceWrapper(mediaShareLinkServices.deleteAll, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy(
					"server:core.routes.media.share.links.delete.all.system.error.message",
				),
				message: copy(
					"server:core.routes.media.share.links.delete.all.system.error.message",
				),
			},
		})(context);
		if (deleteRes.error) throw new LucidAPIError(deleteRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteAllController;

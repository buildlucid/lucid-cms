import { z } from "zod/v4";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/auth.js";
import { authServices } from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import T from "../../../../translations/index.js";
import type { LucidHonoContext } from "../../../../types/hono.js";

const factory = createFactory();

const setupRequiredController = factory.createHandlers(
	describeRoute({
		description:
			"Checks if initial user setup is required. Returns true if no users exist in the system.",
		tags: ["auth"],
		summary: "Check Setup Required",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.setupRequired.response),
		}),
		validateResponse: true,
	}),
	async (c: LucidHonoContext) => {
		const setupRequiredRes = await serviceWrapper(authServices.setupRequired, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_setup_required_error_name"),
				message: T("route_setup_required_error_message"),
			},
		})({
			db: c.get("config").db.client,
			config: c.get("config"),
			queue: c.get("queue"),
			env: c.get("env"),
			kv: c.get("kv"),
		});
		if (setupRequiredRes.error) throw new LucidAPIError(setupRequiredRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: setupRequiredRes.data,
			}),
		);
	},
);

export default setupRequiredController;

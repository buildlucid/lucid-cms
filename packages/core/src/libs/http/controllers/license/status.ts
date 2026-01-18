import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/license.js";
import { licenseServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import formatAPIResponse from "../../utils/build-response.js";

const factory = createFactory();

const statusController = factory.createHandlers(
	describeRoute({
		description: "Returns current license status from database.",
		tags: ["license"],
		summary: "Get License Status",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.status.response),
		}),
	}),
	authenticate,
	async (c) => {
		const res = await serviceWrapper(licenseServices.licenseStatus, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("default_error_name"),
				message: T("default_error_message"),
			},
		})({
			db: c.get("config").db,
			config: c.get("config"),
			queue: c.get("queue"),
			env: c.get("env"),
			kv: c.get("kv"),
		});
		if (res.error) throw new LucidAPIError(res.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: res.data,
			}),
		);
	},
);

export default statusController;

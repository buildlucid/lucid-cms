import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const clearKVController = factory.createHandlers(
	describeRoute({
		description: "Clears the KV store, invalidating cached data.",
		tags: ["settings"],
		summary: "Clear KV",
		responses: honoOpenAPIResponse({ noProperties: true }),
		parameters: honoOpenAPIParamaters({ headers: { csrf: true } }),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.ClearKv]),
	async (c) => {
		await c.get("kv").command.clear();

		c.status(204);
		return c.body(null);
	},
);

export default clearKVController;

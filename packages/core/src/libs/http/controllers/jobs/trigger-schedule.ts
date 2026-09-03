import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/jobs.js";
import { jobServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const triggerScheduleController = factory.createHandlers(
	describeRoute({
		description: "Enqueues one registered job schedule immediately.",
		tags: ["jobs"],
		summary: "Trigger Job Schedule",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.triggerSchedule.response),
		}),
		parameters: openAPI.parameters({ headers: { csrf: true } }),
		requestBody: openAPI.requestBody(controllerSchemas.triggerSchedule.body),
	}),
	validateCSRF,
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: minutesToMilliseconds(1),
	}),
	permissions([Permissions.JobsRun]),
	validate("json", controllerSchemas.triggerSchedule.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(jobServices.triggerSchedule, {
			transaction: true,
			defaultError: {
				type: "basic",
				message: copy("server:core.jobs.schedule.trigger.failed"),
			},
		})(context, {
			scheduleKey: body.scheduleKey,
			userId: c.get("auth").id,
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default triggerScheduleController;

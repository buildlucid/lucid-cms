import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/jobs.js";
import { jobServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Returns a single job by its row ID, or by the job ID that receipts and listings return.",
		tags: ["jobs"],
		summary: "Get Job",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getSingle.params,
		}),
	})),
	authenticate(),
	permissions([Permissions.JobsRead]),
	validate("param", controllerSchemas.getSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const job = await serviceWrapper(jobServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.job.fetch.error.name"),
				message: copy("server:core.routes.job.fetch.error.message"),
			},
		})(context, /^\d+$/.test(id) ? { id: Number(id) } : { jobId: id });
		if (job.error) throw new LucidError(job.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: job.data,
			}),
		);
	},
);

export default getSingleController;

import type z from "zod";
import type { RequestUser } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
import { inputSchema } from "./schema.js";

/** A request to list reviewers for, optionally read as a user. */
export type ToolkitRequestsGetReviewersInput = z.input<typeof inputSchema>;

/** Lists people who can approve a request, leaving out its creator unless the collections allow self-approval. */
const getReviewers = (
	context: ServiceContext,
	input: ToolkitRequestsGetReviewersInput,
): ServiceResponse<RequestUser[]> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getReviewers } = await import(
				"../../../../services/requests/get-reviewers.js"
			);

			return runRequestService(context, {
				actor: data.actor,
				transaction: false,
				run: (context, user) => getReviewers(context, { id: data.id, user }),
			});
		},
		name: { key: "core.toolkit.requests.get-reviewers.error.name" },
		message: { key: "core.toolkit.requests.get-reviewers.error.message" },
	});

export default getReviewers;

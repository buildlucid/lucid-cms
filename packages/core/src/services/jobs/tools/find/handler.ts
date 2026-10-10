import type z from "zod";
import { getPagination } from "../../../../libs/tools/pagination.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getMultiple from "../../get-multiple.js";
import { formatJob } from "../schema.js";
import type { inputSchema, outputSchema } from "./schema.js";

const findJobs: ServiceFn<
	[{ input: z.output<typeof inputSchema> }],
	{ output: z.output<typeof outputSchema> }
> = async (context, { input }) => {
	const jobsRes = await getMultiple(context, { query: input.query });
	if (jobsRes.error) return jobsRes;

	return {
		error: undefined,
		data: {
			output: {
				data: jobsRes.data.data.map(formatJob),
				pagination: getPagination(
					jobsRes.data.count,
					input.query.page,
					input.query.perPage,
				),
			},
		},
	};
};

export default findJobs;

import type z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getSingle from "../../get-single.js";
import { formatJob } from "../schema.js";
import type { inputSchema, outputSchema } from "./schema.js";

const getJob: ServiceFn<
	[{ input: z.output<typeof inputSchema> }],
	{ output: z.output<typeof outputSchema> }
> = async (context, { input }) => {
	const jobRes = await getSingle(context, { jobId: input.jobId });
	if (jobRes.error) return jobRes;

	return {
		error: undefined,
		data: { output: { data: formatJob(jobRes.data) } },
	};
};

export default getJob;

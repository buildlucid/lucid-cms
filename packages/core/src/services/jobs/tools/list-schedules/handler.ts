import type z from "zod";
import { getPagination } from "../../../../libs/tools/pagination.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getSchedules from "../../get-schedules.js";
import type { inputSchema, outputSchema } from "./schema.js";

const listSchedules: ServiceFn<
	[{ input: z.output<typeof inputSchema> }],
	{ output: z.output<typeof outputSchema> }
> = async (context, { input }) => {
	const schedulesRes = await getSchedules(context, { query: input.query });
	if (schedulesRes.error) return schedulesRes;

	return {
		error: undefined,
		data: {
			output: {
				data: schedulesRes.data.data,
				pagination: getPagination(
					schedulesRes.data.count,
					input.query.page,
					input.query.perPage,
				),
			},
		},
	};
};

export default listSchedules;

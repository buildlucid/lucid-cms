import formatter, { aiUsageFormatter } from "../../../libs/formatters/index.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { GetUsageSessionRecordsQueryParams } from "../../../schemas/ai.js";
import type {
	AiUsageRecord,
	AiUsageSessionType,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const getSessionRecords: ServiceFn<
	[
		{
			type: AiUsageSessionType;
			id: string;
			query: GetUsageSessionRecordsQueryParams;
		},
	],
	{ data: AiUsageRecord[]; count: number }
> = async (context, input) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const records = await AiGenerations.selectSessionRecords({
		type: input.type,
		id: input.id,
		queryParams: input.query,
		validation: { enabled: true },
	});
	if (records.error) return records;

	return {
		error: undefined,
		data: {
			data: records.data[0].map(aiUsageFormatter.formatRecord),
			count: formatter.parseCount(records.data[1]?.count),
		},
	};
};

export default getSessionRecords;

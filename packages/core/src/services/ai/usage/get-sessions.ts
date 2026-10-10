import formatter from "../../../libs/formatters/index.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { GetUsageSessionsQueryParams } from "../../../schemas/ai.js";
import type { AiUsageSession } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import hydrateUsageSessions from "../helpers/hydrate-usage-sessions.js";

const getSessions: ServiceFn<
	[{ query: GetUsageSessionsQueryParams; viewerId: number | null }],
	{ data: AiUsageSession[]; count: number }
> = async (context, input) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const sessions = await AiGenerations.selectSessions({
		queryParams: input.query,
	});
	if (sessions.error) return sessions;

	const hydrated = await hydrateUsageSessions(context, {
		sessions: sessions.data[0],
		viewerId: input.viewerId,
	});
	if (hydrated.error) return hydrated;

	return {
		error: undefined,
		data: {
			data: hydrated.data,
			count: formatter.parseCount(sessions.data[1]?.count),
		},
	};
};

export default getSessions;

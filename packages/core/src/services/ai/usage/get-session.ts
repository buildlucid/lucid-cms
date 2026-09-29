import { copy } from "../../../libs/i18n/index.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type {
	AiUsageSession,
	AiUsageSessionType,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import hydrateUsageSessions from "../helpers/hydrate-usage-sessions.js";

const getSession: ServiceFn<
	[{ type: AiUsageSessionType; id: string; viewerId: number }],
	AiUsageSession
> = async (context, input) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const session = await AiGenerations.selectSession(input);
	if (session.error) return session;

	const hydrated = await hydrateUsageSessions(context, {
		sessions: session.data ? [session.data] : [],
		viewerId: input.viewerId,
	});
	if (hydrated.error) return hydrated;

	const formatted = hydrated.data[0];
	if (!formatted) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.ai.usage.session.not.found"),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: formatted };
};

export default getSession;

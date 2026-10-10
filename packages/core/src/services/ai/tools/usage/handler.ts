import type z from "zod";
import { getPagination } from "../../../../libs/tools/pagination.js";
import { formatUser } from "../../../../libs/tools/person.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getCredits from "../../usage/get-credits.js";
import getSessions from "../../usage/get-sessions.js";
import getUsageChart from "../../usage/get-usage-chart.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Reads selected AI usage sections, linking chats only when the run's acting person can open them. */
const getUsage: ServiceFn<
	[{ input: z.output<typeof inputSchema>; viewerId: number | null }],
	{ output: z.output<typeof outputSchema> }
> = async (context, { input, viewerId }) => {
	const include = new Set(input.include);

	const [creditsRes, sessionsRes, chartRes] = await Promise.all([
		include.has("credits") ? getCredits(context) : undefined,
		include.has("sessions")
			? getSessions(context, { query: input.sessions, viewerId })
			: undefined,
		include.has("chart")
			? getUsageChart(context, {
					query: {
						dimension: "day",
						metric: input.chart.metrics?.join(","),
						startDate: input.chart.startDate,
						endDate: input.chart.endDate,
						"filter[featureKey]": input.chart.featureKey,
						"filter[userId]": input.chart.userId,
					},
				})
			: undefined,
	]);
	if (creditsRes?.error) return creditsRes;
	if (sessionsRes?.error) return sessionsRes;
	if (chartRes?.error) return chartRes;

	return {
		error: undefined,
		data: {
			output: {
				credits: creditsRes?.data ?? null,
				sessions: sessionsRes
					? {
							data: sessionsRes.data.data.map((session) => ({
								...session,
								user: session.user ? formatUser(session.user) : null,
							})),
							pagination: getPagination(
								sessionsRes.data.count,
								input.sessions.page,
								input.sessions.perPage,
							),
						}
					: null,
				chart: chartRes?.data ?? null,
			},
		},
	};
};

export default getUsage;

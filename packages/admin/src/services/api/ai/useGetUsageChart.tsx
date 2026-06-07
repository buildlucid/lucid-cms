import { useQuery } from "@tanstack/solid-query";
import type {
	AiUsageChart,
	AiUsageChartDimension,
	AiUsageChartMetric,
	ResponseBody,
} from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";

interface QueryParams {
	dimension: Accessor<AiUsageChartDimension>;
	metrics: Accessor<AiUsageChartMetric[]>;
	startDate: Accessor<string>;
	endDate: Accessor<string>;
	featureKey: Accessor<string | undefined>;
}

const useGetUsageChart = (params: QueryHook<QueryParams>) => {
	const queryString = createMemo(() => {
		const query = new URLSearchParams();

		query.set("dimension", params.queryParams.dimension());
		query.set("metric", params.queryParams.metrics().join(","));
		query.set("startDate", params.queryParams.startDate());
		query.set("endDate", params.queryParams.endDate());

		const featureKey = params.queryParams.featureKey();
		if (featureKey) {
			query.set("filter[featureKey]", featureKey);
		}

		return query.toString();
	});

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["ai.getUsageChart", queryString(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<AiUsageChart>>({
				url: "/lucid/api/v1/ai/usage/chart",
				query: {
					queryString: queryString(),
				},
				config: {
					method: "GET",
				},
			}),
		get refetchOnWindowFocus() {
			return params.refetchOnWindowFocus ?? false;
		},
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetUsageChart;

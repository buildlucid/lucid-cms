import { useQuery } from "@tanstack/solid-query";
import type { Deploy, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import { isDeployBusy } from "@/utils/deploys";
import request from "@/utils/request";

/** Polls every 5 seconds while a deploy is busy, then backs off the longer nothing changes. */
const getRefetchInterval = () => {
	let fingerprint: string | undefined;
	let changedAt = Date.now();

	return (deploys: Deploy[] | undefined) => {
		//* keep trying after a failed load, but an empty list comes from config and never changes
		if (!deploys) return 60_000;
		if (deploys.length === 0) return false;

		const next = JSON.stringify(
			deploys.map((deploy) => [
				deploy.enabled,
				deploy.pending?.count,
				deploy.queuedRun?.id,
				deploy.runningRun?.status,
				deploy.recentRuns[0]?.id,
			]),
		);
		if (next !== fingerprint) {
			fingerprint = next;
			changedAt = Date.now();
		}

		if (deploys.some(isDeployBusy)) return 5_000;

		const idleFor = Date.now() - changedAt;
		if (idleFor < 60_000) return 15_000;
		if (idleFor < 300_000) return 30_000;
		return 60_000;
	};
};

/** The configured deploys with their current state, polled while the tab is visible. */
const useGetMultiple = (params?: { enabled?: () => boolean }) => {
	const refetchInterval = getRefetchInterval();

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: queryKeys.deploys.list(),
		queryFn: ({ signal }) =>
			request<ResponseBody<Deploy[]>>({
				url: "/api/v1/deploys",
				signal,
				displayErrorToast: false,
				method: "GET",
			}),
		refetchInterval: (query) => refetchInterval(query.state.data?.data),
		refetchIntervalInBackground: false,
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetMultiple;

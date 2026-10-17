import { useQuery, useQueryClient } from "@tanstack/solid-query";
import type { RequestExecution, ResponseBody } from "@types";
import { type Accessor, createEffect } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import { requestChangeKeys } from "./change-keys";

/** Polls the current publication attempt, refreshing content once it finishes or changes. */
const useGetExecution = (params: {
	id: Accessor<number | undefined>;
	jobId: Accessor<string | null | undefined>;
}) => {
	const queryClient = useQueryClient();
	const query = useQuery(() => ({
		queryKey: queryKeys.requestExecutions.detail(params.id(), params.jobId()),
		queryFn: ({ signal }) =>
			request<ResponseBody<RequestExecution | null>>({
				url: `/api/v1/requests/${params.id()}/execution`,
				signal,
				displayErrorToast: false,
			}),
		enabled: params.id() !== undefined && Boolean(params.jobId()),
		refetchInterval: (query) => {
			const execution = query.state.data?.data;
			if (execution === undefined) return 5_000;
			if (!execution || execution.jobId !== params.jobId()) return false;
			if (execution.status === "running") return 1_000;
			if (execution.status !== "queued") return false;

			const untilDue = execution.runAt
				? new Date(execution.runAt).getTime() - Date.now()
				: 0;
			return Math.max(1_000, Math.min(30_000, untilDue));
		},
	}));

	let refreshed: string | undefined;
	createEffect(() => {
		const id = params.id();
		const jobId = params.jobId();
		if (id === undefined || !jobId || !query.isSuccess || query.isFetching) {
			return;
		}
		const execution = query.data?.data;
		if (
			execution?.jobId === jobId &&
			(execution.status === "queued" || execution.status === "running")
		) {
			return;
		}

		const attempt = `${id}:${jobId}`;
		if (refreshed === attempt) return;
		refreshed = attempt;
		for (const queryKey of [
			...requestChangeKeys(),
			queryKeys.documents.all(),
		]) {
			queryClient.invalidateQueries({ queryKey });
		}
	});

	return query;
};

export default useGetExecution;

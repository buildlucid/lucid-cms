import { type Component, createEffect } from "solid-js";
import api from "@/services/api";

//* completions further off than this, such as schedules, are left to the request page
const watchWindow = 60_000;

/**
 * Follows a request the agent changed until any completion it started has
 * run, so open documents refresh with the result wherever the reader is.
 * Renders nothing and calls `onSettled` once there is nothing left to wait for.
 */
const AgentRequestWatcher: Component<{
	requestId: number;
	onSettled: () => void;
}> = (props) => {
	// ----------------------------------------
	// Queries
	const request = api.requests.useGetSingle({
		queryParams: { location: { id: () => props.requestId } },
	});
	//* refreshes requests, documents and review once the attempt finishes
	const execution = api.requests.useGetExecution({
		id: () => props.requestId,
		jobId: () => request.data?.data.executionJobId,
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (request.isError) {
			props.onSettled();
			return;
		}
		//* a cached copy can predate the completion, so wait for the refetch
		if (!request.isSuccess || request.isFetching) return;

		const jobId = request.data.data.executionJobId;
		if (jobId) {
			if (!execution.isSuccess || execution.isFetching) return;
			const current = execution.data.data;
			const due = current?.runAt
				? new Date(current.runAt).getTime() - Date.now()
				: 0;
			if (
				current?.jobId === jobId &&
				(current.status === "running" ||
					(current.status === "queued" && due < watchWindow))
			) {
				return;
			}
		}

		props.onSettled();
	});

	// ----------------------------------------
	// Render
	return null;
};

export default AgentRequestWatcher;

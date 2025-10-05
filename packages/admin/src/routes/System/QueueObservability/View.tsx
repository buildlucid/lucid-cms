import T from "@/translations";
import type { Component } from "solid-js";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import { QueryRow } from "@/components/Groups/Query";
import { Wrapper } from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";
import { JobsList } from "@/components/Groups/Content";
import { useQueryClient } from "@tanstack/solid-query";

const SystemQueueObservabilityRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useSearchParamsLocation(
		{
			filters: {
				jobId: {
					value: "",
					type: "text",
				},
				eventType: {
					value: "",
					type: "text",
				},
				status: {
					value: "",
					type: "array",
				},
				queueAdapterKey: {
					value: "",
					type: "text",
				},
			},
			sorts: {
				createdAt: "desc",
				scheduledFor: undefined,
				startedAt: undefined,
				completedAt: undefined,
				failedAt: undefined,
				priority: undefined,
				attempts: undefined,
			},
		},
		{
			singleSort: true,
		},
	);

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("system_queue_observability_route_title"),
							description: T()("system_queue_observability_route_description"),
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
									onRefresh={() => {
										queryClient.invalidateQueries({
											queryKey: ["jobs.getMultiple"],
										});
									}}
									filters={[
										{
											label: T()("job_id"),
											key: "jobId",
											type: "text",
										},
										{
											label: T()("event_type"),
											key: "eventType",
											type: "text",
										},
										{
											label: T()("status"),
											key: "status",
											type: "multi-select",
											options: [
												{
													label: T()("pending"),
													value: "pending",
												},
												{
													label: T()("processing"),
													value: "processing",
												},
												{
													label: T()("completed"),
													value: "completed",
												},
												{
													label: T()("failed"),
													value: "failed",
												},
												{
													label: T()("cancelled"),
													value: "cancelled",
												},
											],
										},
										{
											label: T()("queue_adapter"),
											key: "queueAdapterKey",
											type: "text",
										},
									]}
									sorts={[
										{
											label: T()("created_at"),
											key: "createdAt",
										},
										{
											label: T()("scheduled_for"),
											key: "scheduledFor",
										},
										{
											label: T()("started_at"),
											key: "startedAt",
										},
										{
											label: T()("completed_at"),
											key: "completedAt",
										},
										{
											label: T()("failed_at"),
											key: "failedAt",
										},
										{
											label: T()("priority"),
											key: "priority",
										},
										{
											label: T()("attempts"),
											key: "attempts",
										},
									]}
									perPage={[]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<JobsList
				state={{
					searchParams: searchParams,
				}}
			/>
		</Wrapper>
	);
};

export default SystemQueueObservabilityRoute;

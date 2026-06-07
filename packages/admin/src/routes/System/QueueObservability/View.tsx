import { useQueryClient } from "@tanstack/solid-query";
import type { Component } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { JobsList } from "@/components/Groups/Content";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import T from "@/translations";

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
				header: <SystemSettingsHeader />,
			}}
		>
			<DynamicContent options={{ padding: "24" }}>
				<InfoRow.Root
					title={T()("routes.system.queue.observability.title")}
					description={T()("routes.system.queue.observability.description")}
				>
					<InfoRow.Content>
						<div class="-mx-4 overflow-hidden">
							<QueryRow
								searchParams={searchParams}
								onRefresh={() => {
									queryClient.invalidateQueries({
										queryKey: ["jobs.getMultiple"],
									});
								}}
								filters={[
									{
										label: T()("jobs.id"),
										key: "jobId",
										type: "text",
									},
									{
										label: T()("common.event.type"),
										key: "eventType",
										type: "text",
									},
									{
										label: T()("common.status"),
										key: "status",
										type: "multi-select",
										options: [
											{
												label: T()("common.status.pending"),
												value: "pending",
											},
											{
												label: T()("common.status.processing"),
												value: "processing",
											},
											{
												label: T()("common.status.completed"),
												value: "completed",
											},
											{
												label: T()("common.status.failed"),
												value: "failed",
											},
											{
												label: T()("common.status.cancelled"),
												value: "cancelled",
											},
										],
									},
									{
										label: T()("queue.adapter"),
										key: "queueAdapterKey",
										type: "text",
									},
								]}
								sorts={[
									{
										label: T()("common.created.at"),
										key: "createdAt",
									},
									{
										label: T()("common.scheduled.for"),
										key: "scheduledFor",
									},
									{
										label: T()("common.started.at"),
										key: "startedAt",
									},
									{
										label: T()("common.completed.at"),
										key: "completedAt",
									},
									{
										label: T()("common.failed.at"),
										key: "failedAt",
									},
									{
										label: T()("common.priority"),
										key: "priority",
									},
									{
										label: T()("common.attempts"),
										key: "attempts",
									},
								]}
								perPage={[]}
								options={{
									padding: "16",
								}}
							/>
							<JobsList
								state={{
									searchParams: searchParams,
								}}
							/>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>
			</DynamicContent>
		</Wrapper>
	);
};

export default SystemQueueObservabilityRoute;

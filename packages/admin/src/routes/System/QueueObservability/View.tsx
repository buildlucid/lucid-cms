import { useQueryClient } from "@tanstack/solid-query";
import type { Component } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { JobsList } from "@/components/Groups/Content";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import useQueryState, {
	numberFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import T from "@/translations";

const SystemQueueObservabilityRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				jobId: textFilter(),
				eventType: textFilter(),
				status: textFilter(),
				queueAdapterKey: textFilter(),
				priority: numberFilter(),
				attempts: numberFilter(),
				maxAttempts: numberFilter(),
				errorMessage: textFilter(),
				createdByUserId: numberFilter(),
				createdAt: textFilter(),
				scheduledFor: textFilter(),
				startedAt: textFilter(),
				completedAt: textFilter(),
				failedAt: textFilter(),
				nextRetryAt: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
				scheduledFor: sort(),
				startedAt: sort(),
				completedAt: sort(),
				failedAt: sort(),
				priority: sort(),
				attempts: sort(),
			},
		},
		options: {
			singleSort: true,
		},
	});

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
								filterSection={{
									subject: T()("routes.system.queue.observability.title"),
									fields: [
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
											type: "select",
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
										{
											label: T()("common.priority"),
											key: "priority",
											type: "number",
										},
										{
											label: T()("common.attempts"),
											key: "attempts",
											type: "number",
										},
										{
											label: T()("common.max.attempts"),
											key: "maxAttempts",
											type: "number",
										},
										{
											label: T()("common.error.message"),
											key: "errorMessage",
											type: "text",
										},
										{
											label: T()("common.created.by"),
											key: "createdByUserId",
											type: "user",
										},
										{
											label: T()("common.created.at"),
											key: "createdAt",
											type: "datetime",
										},
										{
											label: T()("common.scheduled.for"),
											key: "scheduledFor",
											type: "datetime",
										},
										{
											label: T()("common.started.at"),
											key: "startedAt",
											type: "datetime",
										},
										{
											label: T()("common.completed.at"),
											key: "completedAt",
											type: "datetime",
										},
										{
											label: T()("common.failed.at"),
											key: "failedAt",
											type: "datetime",
										},
										{
											label: T()("common.next.retry.at"),
											key: "nextRetryAt",
											type: "datetime",
										},
									],
								}}
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

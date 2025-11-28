import T from "@/translations";
import { type Component, type Accessor, Show } from "solid-js";
import api from "@/services/api";
import { Panel } from "@/components/Groups/Panel";
import SectionHeading from "@/components/Blocks/SectionHeading";
import DetailsList from "@/components/Partials/DetailsList";
import JSONPreview from "@/components/Partials/JSONPreview";
import dateHelpers from "@/utils/date-helpers";

interface ViewJobPanelProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ViewJobPanel: Component<ViewJobPanelProps> = (props) => {
	// ---------------------------------
	// Queries
	const job = api.jobs.useGetSingle({
		queryParams: {
			location: {
				jobId: props.id,
			},
		},
		enabled: () => !!props.id(),
	});

	// ---------------------------------
	// Render
	return (
		<Panel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: job.isLoading,
				isError: job.isError,
			}}
			options={{
				padding: "24",
				hideFooter: true,
			}}
			copy={{
				title: T()("view_job_panel_title"),
				description: T()("view_job_panel_description"),
			}}
		>
			{() => (
				<>
					<SectionHeading title={T()("details")} />
					<DetailsList
						type="text"
						items={[
							{
								label: T()("job_id"),
								value: job.data?.data.jobId ?? undefined,
							},
							{
								label: T()("event_type"),
								value: job.data?.data.eventType ?? undefined,
							},
							{
								label: T()("status"),
								value: job.data?.data.status ?? undefined,
							},
							{
								label: T()("queue_adapter"),
								value: job.data?.data.queueAdapterKey ?? undefined,
							},
							{
								label: T()("priority"),
								value: job.data?.data.priority ?? "-",
							},
							{
								label: T()("attempts"),
								value: job.data?.data.attempts ?? 0,
							},
							{
								label: T()("max_attempts"),
								value: job.data?.data.maxAttempts ?? 0,
							},
							{
								label: T()("created_at"),
								value: dateHelpers.formatDate(job.data?.data.createdAt),
							},
							{
								label: T()("scheduled_for"),
								value: dateHelpers.formatDate(job.data?.data.scheduledFor),
							},
							{
								label: T()("started_at"),
								value: dateHelpers.formatDate(job.data?.data.startedAt),
							},
							{
								label: T()("completed_at"),
								value: dateHelpers.formatDate(job.data?.data.completedAt),
							},
							{
								label: T()("failed_at"),
								value: dateHelpers.formatDate(job.data?.data.failedAt),
							},
							{
								label: T()("next_retry_at"),
								value: dateHelpers.formatDate(job.data?.data.nextRetryAt),
							},
						]}
					/>
					<Show
						when={
							job.data?.data.status === "failed" && job.data?.data.errorMessage
						}
					>
						<div class="mb-4 p-4 bg-error-base/10 border border-error-base/20 rounded-md -mt-2.5">
							<h3 class="text-sm font-medium text-title mb-1">
								{T()("failed_with_message")}
							</h3>
							<p class="text-sm text-body">{job.data?.data.errorMessage}</p>
						</div>
					</Show>
					<Show when={job.data?.data.eventData}>
						<SectionHeading title={T()("job_payload")} />
						<div class="mb-4">
							<JSONPreview
								title={T()("job_payload")}
								json={job.data?.data.eventData || {}}
							/>
						</div>
					</Show>
				</>
			)}
		</Panel>
	);
};

export default ViewJobPanel;

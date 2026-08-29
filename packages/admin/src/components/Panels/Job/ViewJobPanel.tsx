import { type Accessor, type Component, lazy, Show, Suspense } from "solid-js";
import SectionHeading from "@/components/Blocks/SectionHeading";
import { Panel } from "@/components/Groups/Panel";
import DetailsList from "@/components/Partials/DetailsList";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

const JSONPreview = lazy(() => import("@/components/Partials/JSONPreview"));

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
			}}
			copy={{
				title: T()("panels.jobs.view.title"),
			}}
		>
			{() => (
				<>
					<SectionHeading title={T()("common.details")} />
					<DetailsList
						type="text"
						items={[
							{
								label: T()("jobs.id"),
								value: job.data?.data.jobId ?? undefined,
							},
							{
								label: T()("jobs.name"),
								value: job.data?.data.jobName ?? undefined,
							},
							{
								label: T()("jobs.version"),
								value: job.data?.data.jobVersion ?? undefined,
							},
							{
								label: T()("common.status"),
								value: job.data?.data.status ?? undefined,
							},
							{
								label: T()("queue.adapter"),
								value: job.data?.data.queueAdapterKey ?? undefined,
							},
							{
								label: T()("jobs.dispatch.status"),
								value: job.data?.data.dispatchStatus ?? undefined,
							},
							{
								label: T()("common.attempts"),
								value: job.data?.data.attempts ?? 0,
							},
							{
								label: T()("common.max.attempts"),
								value: job.data?.data.maxAttempts ?? 0,
							},
							{
								label: T()("common.created.at"),
								value: dateHelpers.formatDate(job.data?.data.createdAt),
							},
							{
								label: T()("common.available.at"),
								value: dateHelpers.formatDate(job.data?.data.availableAt),
							},
							{
								label: T()("common.started.at"),
								value: dateHelpers.formatDate(job.data?.data.startedAt),
							},
							{
								label: T()("common.completed.at"),
								value: dateHelpers.formatDate(job.data?.data.completedAt),
							},
							{
								label: T()("common.failed.at"),
								value: dateHelpers.formatDate(job.data?.data.failedAt),
							},
							{
								label: T()("common.cancelled.at"),
								value: dateHelpers.formatDate(job.data?.data.cancelledAt),
							},
							{
								label: T()("jobs.dispatched.at"),
								value: dateHelpers.formatDate(job.data?.data.dispatchedAt),
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
								{T()("common.failed.with.message")}
							</h3>
							<p class="text-sm text-body">{job.data?.data.errorMessage}</p>
						</div>
					</Show>
					<Show when={job.data?.data.displayData}>
						<SectionHeading title={T()("jobs.details")} />
						<div class="mb-4">
							<Suspense
								fallback={
									<div class="h-40 bg-card-base border border-border rounded-md animate-pulse" />
								}
							>
								<JSONPreview
									title={T()("jobs.details")}
									json={job.data?.data.displayData || {}}
								/>
							</Suspense>
						</div>
					</Show>
				</>
			)}
		</Panel>
	);
};

export default ViewJobPanel;

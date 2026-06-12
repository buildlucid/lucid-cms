import type { PublishOperationOverview } from "@types";
import {
	FaSolidCalendar,
	FaSolidClock,
	FaSolidTriangleExclamation,
	FaSolidUserCheck,
} from "solid-icons/fa";
import type { Component } from "solid-js";
import T from "@/translations";
import DashboardMetricTile from "./DashboardMetricTile";

const DashboardReleaseOverview: Component<{
	overview?: PublishOperationOverview;
	loading: boolean;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<section>
			<div class="mb-4">
				<h2>{T()("dashboard.release.requests.title")}</h2>
				<p class="mt-1 text-sm text-body">
					{T()("dashboard.release.requests.description")}
				</p>
			</div>
			<div class="overflow-hidden rounded-md border border-border bg-card-base">
				<div class="grid grid-cols-1 bg-card-base md:grid-cols-2 2xl:grid-cols-4">
					<DashboardMetricTile
						icon={<FaSolidUserCheck size={14} />}
						label={T()("common.assigned.to.me")}
						value={props.overview?.assignedToMe}
						description={T()("dashboard.release.requests.assigned.description")}
						tone="blue"
						href="/lucid/release-requests?filter[assignedToMe]=true"
						loading={props.loading}
						class={
							"border-b border-border md:odd:border-r md:nth-last-[-n+2]:border-b-0 2xl:border-b-0 2xl:not-last:border-r"
						}
					/>
					<DashboardMetricTile
						icon={<FaSolidClock size={14} />}
						label={T()("common.pending.review")}
						value={props.overview?.pending}
						description={T()("dashboard.release.requests.pending.description")}
						tone="yellow"
						href="/lucid/release-requests?filter[status]=pending"
						loading={props.loading}
						class={
							"border-b border-border md:odd:border-r md:nth-last-[-n+2]:border-b-0 2xl:border-b-0 2xl:not-last:border-r"
						}
					/>
					<DashboardMetricTile
						icon={<FaSolidCalendar size={14} />}
						label={T()("common.status.scheduled")}
						value={props.overview?.scheduled}
						description={T()(
							"dashboard.release.requests.scheduled.description",
						)}
						tone="purple"
						href="/lucid/release-requests?filter[executionStatus]=scheduled"
						loading={props.loading}
						class={
							"border-b border-border md:odd:border-r md:nth-last-[-n+2]:border-b-0 2xl:border-b-0 2xl:not-last:border-r"
						}
					/>
					<DashboardMetricTile
						icon={<FaSolidTriangleExclamation size={14} />}
						label={T()("common.status.failed")}
						value={props.overview?.failed}
						description={T()("dashboard.release.requests.failed.description")}
						tone="red"
						href="/lucid/release-requests?filter[executionStatus]=failed"
						loading={props.loading}
						class={
							"border-b border-border md:odd:border-r md:nth-last-[-n+2]:border-b-0 2xl:border-b-0 2xl:not-last:border-r"
						}
					/>
				</div>
			</div>
		</section>
	);
};

export default DashboardReleaseOverview;

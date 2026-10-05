import { A } from "@solidjs/router";
import classNames from "classnames";
import { type Component, createMemo, For } from "solid-js";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import api from "@/services/api";
import T from "@/translations";
import { releaseListRoutes } from "@/utils/releases";

const PublishingWidget: Component<{ size: DashboardWidgetSize }> = () => {
	// ----------------------------------------
	// Queries
	const overview = api.releases.useGetOverview({ queryParams: {} });

	// ----------------------------------------
	// Memos
	const stats = createMemo(() => [
		{
			key: "pending",
			label: T()("releases.state.pending"),
			value: overview.data?.data.awaitingApproval,
			dot: "bg-warning",
			href: releaseListRoutes.pending,
		},
		{
			key: "scheduled",
			label: T()("common.status.scheduled"),
			value: overview.data?.data.scheduled,
			dot: "bg-purple",
			href: releaseListRoutes.scheduled,
		},
		{
			key: "failed",
			label: T()("common.status.failed"),
			value: overview.data?.data.failed,
			dot: "bg-danger",
			href: releaseListRoutes.failed,
		},
	]);

	// ----------------------------------------
	// Render
	return (
		<DashboardCard
			title={T()("home.widget.publishing.label")}
			href="/lucid/releases"
			padding="md"
		>
			<ul class="grid grid-cols-1 gap-2 @lg:grid-cols-3">
				<For each={stats()}>
					{(stat) => (
						<li>
							<A
								href={stat.href}
								class="flex flex-col gap-1 rounded-lg bg-background px-3 py-2.5 transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
							>
								<span class="flex items-center gap-2 text-xs text-muted">
									<span
										class={classNames("size-1.5 rounded-full", stat.dot)}
										aria-hidden="true"
									/>
									{stat.label}
								</span>
								<span class="text-2xl tabular-nums text-title">
									{overview.isLoading ? "-" : (stat.value ?? 0)}
								</span>
							</A>
						</li>
					)}
				</For>
			</ul>
		</DashboardCard>
	);
};

export default PublishingWidget;

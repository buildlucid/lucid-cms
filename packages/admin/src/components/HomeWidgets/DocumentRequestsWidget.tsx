import { type Component, For, Index, Show } from "solid-js";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import DashboardCardItem from "@/components/DashboardCardItem/DashboardCardItem";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import { getReleaseState, releaseStates } from "@/utils/releases";
import { getReleaseRoute } from "@/utils/route-helpers";

/** The open create releases the current user has made, so they can follow their requested documents. */
const DocumentRequestsWidget: Component<{ size: DashboardWidgetSize }> = () => {
	// ----------------------------------------
	// Queries
	const requests = api.releases.useGetMultiple({
		queryParams: {
			filters: {
				type: () => "create",
				status: () => "open",
				createdBy: () => userStore.get.user?.id,
			},
			perPage: 6,
		},
		enabled: () => userStore.get.user?.id !== undefined,
	});

	// ----------------------------------------
	// Render
	return (
		<DashboardCard
			title={T()("home.widget.requests.label")}
			href={`/lucid/releases?filter[status]=open&filter[type]=create&filter[createdBy]=${userStore.get.user?.id ?? ""}`}
		>
			<Show
				when={requests.isLoading || (requests.data?.data.length ?? 0) > 0}
				fallback={
					<div class="flex grow flex-col items-center justify-center px-4 py-8 text-center">
						<p class="text-sm text-body">{T()("home.widget.requests.empty")}</p>
					</div>
				}
			>
				<ul class="flex flex-col">
					<Show
						when={!requests.isLoading}
						fallback={
							<Index each={[1, 2, 3]}>
								{() => (
									<li class="flex flex-col gap-1.5 px-2 py-2">
										<span class="skeleton block h-3.5 w-1/2" />
										<span class="skeleton block h-3 w-1/3" />
									</li>
								)}
							</Index>
						}
					>
						<For each={requests.data?.data}>
							{(release) => (
								<li>
									<DashboardCardItem
										href={getReleaseRoute({ releaseId: release.id })}
										title={release.title}
										description={dateHelpers.formatTimestamp(release.updatedAt)}
										meta={
											<StatusIndicator
												size="xs"
												variant={
													releaseStates[getReleaseState(release)].indicator
												}
												label={releaseStates[getReleaseState(release)].label()}
											/>
										}
									/>
								</li>
							)}
						</For>
					</Show>
				</ul>
			</Show>
		</DashboardCard>
	);
};

export default DocumentRequestsWidget;

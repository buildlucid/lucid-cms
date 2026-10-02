import { type Component, createMemo, Show } from "solid-js";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";

const StorageWidget: Component<{ size: DashboardWidgetSize }> = () => {
	// ----------------------------------------
	// Queries
	const settings = api.settings.useGetSettings({
		queryParams: { include: { media: true } },
	});

	// ----------------------------------------
	// Memos
	const storage = createMemo(() => settings.data?.data.media?.storage);
	const percent = createMemo(() => {
		const { total, used } = storage() ?? {};
		if (!total || !used || total <= 0) return 0;
		return Math.min(100, Math.floor((used / total) * 100));
	});

	// ----------------------------------------
	// Render
	return (
		<DashboardCard
			title={T()("home.widget.storage.label")}
			href="/lucid/system/overview"
			padding="md"
		>
			<div class="flex grow flex-col justify-end gap-1.5">
				<p class="text-2xl tabular-nums text-title">
					<Show when={!settings.isLoading} fallback="-">
						{helpers.bytesToSize(storage()?.used ?? 0)}
					</Show>
				</p>
				<Show
					when={storage()?.total}
					fallback={
						<p class="text-xs text-body">
							{T()("home.widget.storage.unlimited")}
						</p>
					}
				>
					{(total) => (
						<ProgressBar
							value={percent()}
							size="sm"
							variant={percent() >= 90 ? "warning" : "primary"}
							labels={{
								start: T()("home.widget.storage.used", { percent: percent() }),
								end: helpers.bytesToSize(total()),
							}}
						/>
					)}
				</Show>
			</div>
		</DashboardCard>
	);
};

export default StorageWidget;

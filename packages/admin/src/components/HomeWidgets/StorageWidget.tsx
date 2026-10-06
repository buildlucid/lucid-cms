import { type Component, createMemo, Show } from "solid-js";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getStorageUsage } from "@/utils/media-storage";

const StorageWidget: Component<{ size: DashboardWidgetSize }> = () => {
	// ----------------------------------------
	// Queries
	const settings = api.settings.useGetSettings({
		queryParams: { include: { media: true } },
	});

	// ----------------------------------------
	// Memos
	const storage = createMemo(() => settings.data?.data.media?.storage);
	const usage = createMemo(() => getStorageUsage(storage()));
	const labels = createMemo(() => {
		const current = storage();
		if (!current) return undefined;
		if (usage().unlimited || !current.total) {
			return { start: T()("home.widget.storage.unlimited") };
		}
		return {
			start: T()("home.widget.storage.used", { percent: usage().percent }),
			end: helpers.bytesToSize(current.total),
		};
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
				<ProgressBar
					value={usage().percent}
					size="sm"
					variant={usage().percent >= 90 ? "warning" : "primary"}
					labels={labels()}
				/>
			</div>
		</DashboardCard>
	);
};

export default StorageWidget;

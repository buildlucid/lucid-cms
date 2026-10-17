import { type Component, createMemo, Show } from "solid-js";
import HomeCard from "@/components/HomeCard/HomeCard";
import type { HomeWidgetSize } from "@/components/HomeWidgets/types";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getStorageUsage } from "@/utils/media-storage";

const StorageWidget: Component<{ size: HomeWidgetSize }> = () => {
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
		if (settings.isError) return { start: T()("home.widget.storage.error") };
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
		<HomeCard
			title={T()("home.widget.storage.label")}
			href="/admin/system/overview"
			padding="md"
		>
			<div class="flex grow flex-col justify-end gap-1.5">
				<p class="text-2xl tabular-nums text-title">
					<Show when={storage()} fallback="-">
						{(current) => helpers.bytesToSize(current().used)}
					</Show>
				</p>
				<ProgressBar
					value={usage().percent}
					size="sm"
					variant={usage().percent >= 90 ? "warning" : "primary"}
					labels={labels()}
				/>
			</div>
		</HomeCard>
	);
};

export default StorageWidget;

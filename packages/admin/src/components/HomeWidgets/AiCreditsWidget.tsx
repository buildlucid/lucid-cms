import { type Component, createMemo, Show } from "solid-js";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import api from "@/services/api";
import T from "@/translations";
import { formatAiCredits } from "@/utils/ai-usage";
import dateHelpers from "@/utils/date-helpers";

const AiCreditsWidget: Component<{ size: DashboardWidgetSize }> = () => {
	// ----------------------------------------
	// Queries
	//* Home is opened often, so a failed load shows here rather than as a toast
	const credits = api.ai.useGetCredits({ displayErrorToast: false });

	// ----------------------------------------
	// Memos
	const data = createMemo(() => credits.data?.data);
	const percent = createMemo(() => {
		const allowance = data()?.allowance;
		if (!allowance || allowance.total <= 0) return 0;
		return Math.min(100, Math.floor((allowance.used / allowance.total) * 100));
	});

	// ----------------------------------------
	// Render
	return (
		<DashboardCard
			title={T()("home.widget.ai.credits.label")}
			href="/lucid/system/ai-usage"
			padding="md"
		>
			<div class="flex grow flex-col justify-end gap-1.5">
				<p class="text-2xl tabular-nums text-title">
					{formatAiCredits(data()?.available) ?? "-"}
				</p>
				<Show
					when={data()?.allowance}
					fallback={
						<Show when={!credits.isLoading}>
							<p class="text-xs text-body">
								{credits.isError
									? T()("home.widget.ai.credits.error")
									: T()("ai.credits.allowance.none")}
							</p>
						</Show>
					}
				>
					{(allowance) => (
						<ProgressBar
							value={percent()}
							size="sm"
							variant={percent() >= 90 ? "warning" : "primary"}
							labels={{
								start: T()("home.widget.ai.credits.used", {
									percent: percent(),
								}),
								end: T()("ai.credits.resets", {
									date: dateHelpers.formatDate(allowance().resetsAt),
								}),
							}}
						/>
					)}
				</Show>
			</div>
		</DashboardCard>
	);
};

export default AiCreditsWidget;

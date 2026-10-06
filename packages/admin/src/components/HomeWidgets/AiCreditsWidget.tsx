import { type Component, createMemo, Show } from "solid-js";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import api from "@/services/api";
import T from "@/translations";
import { formatAiCreditAmount } from "@/utils/ai-usage";
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
	const labels = createMemo(() => {
		if (credits.isLoading) return undefined;
		if (credits.isError) return { start: T()("home.widget.ai.credits.error") };

		const allowance = data()?.allowance;
		if (!allowance) return { start: T()("ai.credits.allowance.none") };
		return {
			start: T()("home.widget.ai.credits.used", { percent: percent() }),
			end: T()("ai.credits.resets", {
				date: dateHelpers.formatDate(allowance.resetsAt),
			}),
		};
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
				<p class="flex items-baseline gap-1.5 text-title">
					<span class="text-2xl tabular-nums">
						{formatAiCreditAmount(data()?.available) ?? "-"}
					</span>
					<Show when={data()?.available !== undefined}>
						<span class="text-sm text-muted">{T()("ai.credits.unit")}</span>
					</Show>
				</p>
				<ProgressBar
					value={percent()}
					size="sm"
					variant={percent() >= 90 ? "warning" : "primary"}
					labels={labels()}
				/>
			</div>
		</DashboardCard>
	);
};

export default AiCreditsWidget;

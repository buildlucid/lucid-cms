import {
	FaSolidArrowRotateRight,
	FaSolidArrowUpRightFromSquare,
} from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import Button from "@/components/Button/Button";
import Link from "@/components/Link/Link";
import constants from "@/constants";
import { Permissions } from "@/constants/permissions";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

/** A failed run's error, with links to usage and Lucid, and a retry when the run can be answered again. */
const AgentErrorNotice: Component<{
	message: string;
	onRetry?: () => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const canViewUsage = createMemo(
		() =>
			userStore.get.hasPermission([Permissions.SettingsRead]).all &&
			siteStore.get.hasAnyAiFeatureEnabled(),
	);
	const canManageConnection = createMemo(
		() => userStore.get.hasPermission([Permissions.ConnectionUpdate]).all,
	);

	// ----------------------------------------
	// Render
	return (
		<section
			role="alert"
			class="rounded-xl border border-danger-low-border bg-card p-4 shadow-sm"
		>
			<div class="flex items-start gap-4">
				<div class="min-w-0 flex-1">
					<h3 class="text-sm font-semibold text-title">
						{T()("agent.error.title")}
					</h3>
					<p class="mt-0.5 text-sm leading-6 text-body">{props.message}</p>
					<div class="mt-4 flex flex-wrap gap-2">
						<Show when={canViewUsage()}>
							<Link href="/lucid/system/ai-usage" variant="outline" size="sm">
								{T()("agent.error.usage.action")}
							</Link>
						</Show>
						<Show when={canManageConnection()}>
							<Link
								href={constants.lucidRemote.website}
								target="_blank"
								rel="noreferrer"
								variant="outline"
								size="sm"
							>
								{T()("connection.remote.visit.action")}
								<FaSolidArrowUpRightFromSquare class="ms-1.5 size-2.5" />
							</Link>
						</Show>
						<Show when={props.onRetry}>
							{(retry) => (
								<Button
									type="button"
									variant="outline"
									size="sm"
									shape="square"
									class="ms-auto"
									aria-label={T()("agent.error.retry")}
									title={T()("agent.error.retry")}
									onClick={() => retry()()}
								>
									<FaSolidArrowRotateRight size={12} />
								</Button>
							)}
						</Show>
					</div>
				</div>
			</div>
		</section>
	);
};

export default AgentErrorNotice;

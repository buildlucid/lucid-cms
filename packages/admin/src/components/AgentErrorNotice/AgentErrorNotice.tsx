import { FaSolidArrowUpRightFromSquare } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import Link from "@/components/Link/Link";
import constants from "@/constants";
import { Permissions } from "@/constants/permissions";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

const AgentErrorNotice: Component<{ message: string }> = (props) => {
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
				<div class="min-w-0">
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
								<FaSolidArrowUpRightFromSquare class="ml-1.5 size-2.5" />
							</Link>
						</Show>
					</div>
				</div>
			</div>
		</section>
	);
};

export default AgentErrorNotice;

import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import Link from "@/components/Link/Link";
import { Permissions } from "@/constants/permissions";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getAgentUnavailableReason } from "@/utils/agent-access";

/** Replaces the composer, passed as children, with the reason while agents cannot run. */
const AgentUnavailableNotice: Component<{ children: JSXElement }> = (props) => {
	// ----------------------------------------
	// Memos
	const reason = createMemo(() => getAgentUnavailableReason());
	const canManageConnection = createMemo(
		() =>
			userStore.get.hasPermission([
				Permissions.SettingsRead,
				Permissions.ConnectionUpdate,
			]).all,
	);

	// ----------------------------------------
	// Render
	return (
		<Show when={reason()} fallback={props.children}>
			{(current) => (
				<section
					role="status"
					class="flex flex-col items-start gap-3 rounded-2xl border border-warning-low-border bg-card p-4"
				>
					<div>
						<h3 class="text-sm font-medium text-title">
							{T()(`agent.unavailable.${current()}.title`)}
						</h3>
						<p class="mt-0.5 text-sm text-body">
							{T()(`agent.unavailable.${current()}.message`)}
						</p>
					</div>
					<Show when={canManageConnection()}>
						<Link href="/lucid/system/operations" variant="outline" size="sm">
							{T()("agent.unavailable.action")}
						</Link>
					</Show>
				</section>
			)}
		</Show>
	);
};

export default AgentUnavailableNotice;

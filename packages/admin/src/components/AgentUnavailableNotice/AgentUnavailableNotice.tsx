import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import AgentComposerNotice from "@/components/AgentComposerNotice/AgentComposerNotice";
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
				<AgentComposerNotice
					warning={true}
					title={T()(`agent.unavailable.${current()}.title`)}
					message={T()(`agent.unavailable.${current()}.message`)}
					action={
						<Show when={canManageConnection()}>
							<Link href="/admin/system/operations" variant="outline" size="sm">
								{T()("agent.unavailable.action")}
							</Link>
						</Show>
					}
				/>
			)}
		</Show>
	);
};

export default AgentUnavailableNotice;

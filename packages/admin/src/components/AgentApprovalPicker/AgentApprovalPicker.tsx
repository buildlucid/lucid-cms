import type { AgentApprovalMode } from "@types";
import classnames from "classnames";
import { FaSolidChevronDown, FaSolidShieldHalved } from "solid-icons/fa";
import { type Component, For } from "solid-js";
import { composerTriggerClasses } from "@/components/AgentComposer/AgentComposer";
import Menu from "@/components/Menu/Menu";
import T from "@/translations";

const modes = [
	"confirm-changes",
	"tool-defaults",
	"automatic",
] as const satisfies readonly AgentApprovalMode[];

/** Chooses the approval policy for the conversation's next run. A run keeps the policy it started with. */
const AgentApprovalPicker: Component<{
	value: AgentApprovalMode;
	disabled?: boolean;
	onChange: (mode: AgentApprovalMode) => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Menu.Root placement="top-start">
			<Menu.Trigger
				class={classnames(
					composerTriggerClasses,
					"min-w-0 max-w-48 px-2 disabled:opacity-50",
				)}
				aria-label={T()("agent.approval.mode.label")}
				title={T()("agent.approval.mode.hint")}
				disabled={props.disabled}
			>
				<FaSolidShieldHalved size={11} class="shrink-0" />
				<span class="truncate">
					{T()(`agent.approval.mode.${props.value}`)}
				</span>
				<FaSolidChevronDown size={9} class="shrink-0" />
			</Menu.Trigger>
			<Menu.Content>
				<For each={modes}>
					{(mode) => (
						<Menu.Item
							class="[&>span]:line-clamp-none"
							textValue={T()(`agent.approval.mode.${mode}`)}
							selected={props.value === mode}
							onSelect={() => props.onChange(mode)}
						>
							<span class="block">{T()(`agent.approval.mode.${mode}`)}</span>
							<span class="block text-xs text-muted whitespace-normal">
								{T()(`agent.approval.mode.${mode}.description`)}
							</span>
						</Menu.Item>
					)}
				</For>
			</Menu.Content>
		</Menu.Root>
	);
};

export default AgentApprovalPicker;

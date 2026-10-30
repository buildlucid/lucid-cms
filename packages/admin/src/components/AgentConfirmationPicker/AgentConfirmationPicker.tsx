import type { AgentConfirmationMode } from "@types";
import { TbOutlineShieldHalf } from "solid-icons/tb";
import { type Component, For, Show } from "solid-js";
import { composerLabelTriggerClasses } from "@/components/ComposerTriggerLabel/classes";
import ComposerTriggerLabel from "@/components/ComposerTriggerLabel/ComposerTriggerLabel";
import Menu from "@/components/Menu/Menu";
import T from "@/translations";

const modes = [
	"confirm-all",
	"tool-defaults",
	"automatic",
] as const satisfies readonly AgentConfirmationMode[];

/** Chooses the next run's confirmation policy without changing any run that has already started. */
const AgentConfirmationPicker: Component<{
	value: AgentConfirmationMode;
	disabled?: boolean;
	routine?: { onEdit: () => void; disabled: boolean };
	onChange: (mode: AgentConfirmationMode) => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show
			when={props.routine}
			fallback={
				<Menu.Root placement="top-start">
					<Menu.Trigger
						class={composerLabelTriggerClasses}
						aria-label={T()("agent.confirmation.mode.label")}
						title={T()("agent.confirmation.mode.hint")}
						disabled={props.disabled}
					>
						<ComposerTriggerLabel
							icon={<TbOutlineShieldHalf size={11} class="shrink-0" />}
							label={T()(`agent.confirmation.mode.${props.value}`)}
						/>
					</Menu.Trigger>
					<Menu.Content>
						<For each={modes}>
							{(mode) => (
								<Menu.Item
									class="[&>span]:line-clamp-none"
									textValue={T()(`agent.confirmation.mode.${mode}`)}
									selected={props.value === mode}
									onSelect={() => props.onChange(mode)}
								>
									<span class="block">
										{T()(`agent.confirmation.mode.${mode}`)}
									</span>
									<span class="block text-xs text-muted whitespace-normal">
										{T()(`agent.confirmation.mode.${mode}.description`)}
									</span>
								</Menu.Item>
							)}
						</For>
					</Menu.Content>
				</Menu.Root>
			}
		>
			{(routine) => (
				<button
					type="button"
					class={composerLabelTriggerClasses}
					title={T()("agent.routine.confirmations.open")}
					aria-label={T()("agent.routine.confirmations.open")}
					disabled={routine().disabled}
					onClick={() => routine().onEdit()}
				>
					<ComposerTriggerLabel
						icon={<TbOutlineShieldHalf size={11} class="shrink-0" />}
						label={T()("agent.confirmation.mode.tool-defaults")}
						alwaysShowLabel={true}
						chevron="right"
					/>
				</button>
			)}
		</Show>
	);
};

export default AgentConfirmationPicker;

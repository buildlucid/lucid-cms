import type { AgentConfirmationMode } from "@types";
import classnames from "classnames";
import {
	TbOutlineChevronDown,
	TbOutlineChevronRight,
	TbOutlineShieldHalf,
} from "solid-icons/tb";
import { type Component, For, Show } from "solid-js";
import { composerTriggerClasses } from "@/components/AgentComposer/AgentComposer";
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
						class={classnames(
							composerTriggerClasses,
							"min-w-0 max-w-48 px-2 disabled:opacity-50",
						)}
						aria-label={T()("agent.confirmation.mode.label")}
						title={T()("agent.confirmation.mode.hint")}
						disabled={props.disabled}
					>
						<TbOutlineShieldHalf size={11} class="shrink-0" />
						<span class="truncate">
							{T()(`agent.confirmation.mode.${props.value}`)}
						</span>
						<TbOutlineChevronDown size={9} class="shrink-0" />
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
					class={classnames(
						composerTriggerClasses,
						"min-w-0 max-w-48 px-2 disabled:opacity-50",
					)}
					title={T()("agent.routine.confirmations.open")}
					aria-label={T()("agent.routine.confirmations.open")}
					disabled={routine().disabled}
					onClick={() => routine().onEdit()}
				>
					<TbOutlineShieldHalf size={11} class="shrink-0" />
					<span class="truncate">
						{T()("agent.confirmation.mode.tool-defaults")}
					</span>
					<TbOutlineChevronRight size={9} class="shrink-0" />
				</button>
			)}
		</Show>
	);
};

export default AgentConfirmationPicker;

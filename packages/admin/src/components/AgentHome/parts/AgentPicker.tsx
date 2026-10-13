import type { Agent } from "@types";
import { TbOutlineRobot } from "solid-icons/tb";
import { type Component, For } from "solid-js";
import ComposerTriggerLabel from "@/components/ComposerTriggerLabel/ComposerTriggerLabel";
import { composerLabelTriggerClasses } from "@/components/ComposerTriggerLabel/classes";
import Menu from "@/components/Menu/Menu";
import T, { translateAdminCopy } from "@/translations";

const AgentPicker: Component<{
	agents: Agent[];
	selected: Agent;
	onSelect: (agent: Agent) => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Menu.Root placement="top-start">
			<Menu.Trigger
				class={composerLabelTriggerClasses}
				aria-label={T()("agent.select.label")}
				title={translateAdminCopy(props.selected.name)}
			>
				<ComposerTriggerLabel
					icon={<TbOutlineRobot size={11} class="shrink-0" />}
					label={translateAdminCopy(props.selected.name)}
				/>
			</Menu.Trigger>
			<Menu.Content>
				<For each={props.agents}>
					{(agent) => (
						<Menu.Item
							textValue={translateAdminCopy(agent.name)}
							selected={agent.key === props.selected.key}
							onSelect={() => props.onSelect(agent)}
						>
							{translateAdminCopy(agent.name)}
						</Menu.Item>
					)}
				</For>
			</Menu.Content>
		</Menu.Root>
	);
};

export default AgentPicker;

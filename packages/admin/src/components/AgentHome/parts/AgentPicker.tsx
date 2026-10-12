import type { Agent } from "@types";
import classnames from "classnames";
import { TbOutlineChevronDown, TbOutlineRobot } from "solid-icons/tb";
import { type Component, For } from "solid-js";
import Menu from "@/components/Menu/Menu";
import { composerTriggerClasses } from "@/components/ModelPicker/triggerClasses";
import T from "@/translations";

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
				class={classnames(composerTriggerClasses, "min-w-0 max-w-48 px-2")}
				aria-label={T()("agent.select.label")}
				title={props.selected.name}
			>
				<TbOutlineRobot size={11} class="shrink-0" />
				{/* a narrow chat box keeps the icon, with the name in the title */}
				<span class="hidden truncate @md/composer:inline">
					{props.selected.name}
				</span>
				<TbOutlineChevronDown size={9} class="shrink-0" />
			</Menu.Trigger>
			<Menu.Content>
				<For each={props.agents}>
					{(agent) => (
						<Menu.Item
							textValue={agent.name}
							selected={agent.key === props.selected.key}
							onSelect={() => props.onSelect(agent)}
						>
							{agent.name}
						</Menu.Item>
					)}
				</For>
			</Menu.Content>
		</Menu.Root>
	);
};

export default AgentPicker;

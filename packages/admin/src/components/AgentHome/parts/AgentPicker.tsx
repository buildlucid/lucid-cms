import type { Agent } from "@types";
import classnames from "classnames";
import { TbOutlineChevronDown, TbOutlineRobot } from "solid-icons/tb";
import { type Component, For } from "solid-js";
import { composerTriggerClasses } from "@/components/AgentComposer/AgentComposer";
import Menu from "@/components/Menu/Menu";
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
				class={classnames(composerTriggerClasses, "max-w-48 px-2")}
				aria-label={T()("agent.select.label")}
			>
				<TbOutlineRobot size={11} class="shrink-0" />
				<span class="truncate">{props.selected.name}</span>
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

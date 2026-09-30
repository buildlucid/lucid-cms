import { FaSolidCircleInfo, FaSolidRepeat } from "solid-icons/fa";
import type { Component, JSXElement } from "solid-js";
import { Show } from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import Button from "@/components/Button/Button";
import T from "@/translations";

const AgentChatActions: Component<{
	routineCard?: { open: boolean; onToggle: () => void };
	runRoutine?: { disabled: boolean; onRun: () => void };
	details: { open: boolean; onToggle: () => void };
	onRename: () => void;
	onDelete: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<>
			<Show when={props.routineCard}>
				{(card) => (
					<SidebarToggle
						label={T()("agent.routine.card.toggle")}
						open={card().open}
						onToggle={card().onToggle}
						icon={<FaSolidRepeat size={11} />}
					/>
				)}
			</Show>
			<SidebarToggle
				label={T()("agent.chat.details.toggle")}
				open={props.details.open}
				onToggle={props.details.onToggle}
				icon={<FaSolidCircleInfo size={11} />}
			/>
			<ActionMenu
				variant="ghost"
				actions={[
					{
						label: T()("agent.routine.run.now"),
						type: "button",
						icon: "rotate",
						show: props.runRoutine !== undefined,
						disabled: props.runRoutine?.disabled,
						onClick: () => props.runRoutine?.onRun(),
					},
					{
						label: T()("common.rename"),
						type: "button",
						icon: "pen",
						onClick: () => props.onRename(),
					},
					{
						label: T()("common.delete"),
						type: "button",
						icon: "trash",
						variant: "danger",
						onClick: () => props.onDelete(),
					},
				]}
			/>
		</>
	);
};

const SidebarToggle: Component<{
	label: string;
	open: boolean;
	onToggle: () => void;
	icon: JSXElement;
}> = (props) => (
	<div class="hidden lg:flex">
		<Button
			size="xs"
			shape="square"
			variant={props.open ? "outline" : "ghost"}
			aria-pressed={props.open}
			aria-label={props.label}
			title={props.label}
			onClick={() => props.onToggle()}
		>
			{props.icon}
		</Button>
	</div>
);

export default AgentChatActions;

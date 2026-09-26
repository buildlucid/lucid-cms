import { agentWidgetSlots } from "virtual:lucid-admin";
import { type Component, createMemo, Show } from "solid-js";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import { resolveSlots } from "@/extensions/slot-policy";
import T from "@/translations";
import type { AgentWidgetProps } from "./types";

/** Renders the matching widget slot, with a fallback for unregistered versions. */
const AgentWidget: Component<
	Pick<AgentWidgetProps, "key" | "version" | "data">
> = (props) => {
	// ----------------------------------------
	// Memos
	const contribution = createMemo(
		() =>
			resolveSlots(agentWidgetSlots, {
				widget: props.key,
				version: props.version,
			})[0],
	);

	// ----------------------------------------
	// Render
	return (
		<Show
			keyed
			when={contribution()}
			fallback={
				<p class="border-l-2 border-border py-0.5 pl-3 text-xs text-muted">
					{T()("agent.widget.unavailable", { key: props.key })}
				</p>
			}
		>
			{(entry) => {
				const Renderer = entry.component;
				return (
					<AdminExtensionBoundary name={entry.key} placement="content">
						<Renderer
							slot="agent.widget"
							key={props.key}
							version={props.version}
							data={props.data}
							options={entry.options}
						/>
					</AdminExtensionBoundary>
				);
			}}
		</Show>
	);
};

export default AgentWidget;

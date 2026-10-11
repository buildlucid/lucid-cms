import { Collapsible } from "@kobalte/core";
import { TbOutlineChevronRight } from "solid-icons/tb";
import { type Component, For } from "solid-js";
import JSONPreview from "@/components/JSONPreview/JSONPreview";
import T from "@/translations";

/** Shows tool values as collapsible JSON, omitting undefined sections and opening initially only when `defaultOpen` is set. */
const AgentToolDetails: Component<{
	sections: { label: string; value: unknown }[];
	defaultOpen?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Collapsible.Root defaultOpen={props.defaultOpen}>
			<Collapsible.Trigger class="group flex items-center gap-1 self-start rounded text-[11px] text-muted transition-colors hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary">
				{T()("agent.tool.details")}
				<TbOutlineChevronRight
					size={8}
					class="transition-transform duration-200 group-data-expanded:rotate-90"
				/>
			</Collapsible.Trigger>
			<Collapsible.Content class="mt-3 flex flex-col gap-4">
				<For
					each={props.sections.filter((section) => section.value !== undefined)}
				>
					{(section) => (
						<section class="flex flex-col gap-2">
							<h4 class="text-xs font-medium text-subtitle">{section.label}</h4>
							<JSONPreview json={section.value} />
						</section>
					)}
				</For>
			</Collapsible.Content>
		</Collapsible.Root>
	);
};

export default AgentToolDetails;

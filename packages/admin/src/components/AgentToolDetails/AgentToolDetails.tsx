import { Collapsible } from "@kobalte/core";
import { FaSolidChevronRight } from "solid-icons/fa";
import { type Component, For } from "solid-js";
import JSONPreview from "@/components/JSONPreview/JSONPreview";
import T from "@/translations";

/**
 * Raw values behind a tool call, such as its input and output, folded away so
 * people who do not need JSON never see it. Sections without a value are left out.
 */
const AgentToolDetails: Component<{
	sections: { label: string; value: unknown }[];
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Collapsible.Root>
			<Collapsible.Trigger class="group flex items-center gap-1 self-start rounded text-[11px] text-muted fill-muted transition-colors hover:text-body hover:fill-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary">
				{T()("agent.tool.details")}
				<FaSolidChevronRight
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

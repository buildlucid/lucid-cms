import type { Collection } from "@types";
import { FaSolidChevronDown } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import WorkflowStageOption from "@/components/DocumentSidebar/parts/WorkflowStageOption";
import Menu from "@/components/Menu/Menu";
import T from "@/translations";
import { formatStageName, getStageColor } from "@/utils/document-sidebar";
import helpers from "@/utils/helpers";

/**
 * A compact workflow stage picker. Shows the stage as text when it can't be
 * changed, and nothing when the collection has no workflow.
 */
const WorkflowStageSelect: Component<{
	collection: Collection | undefined;
	stage: string | null | undefined;
	editable: boolean;
	loading?: boolean;
	onChange: (stage: string) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const stages = createMemo(
		() => props.collection?.publishing.workflow?.stages ?? [],
	);

	// ----------------------------------------
	// Functions
	const current = () => (
		<WorkflowStageOption
			label={formatStageName({
				collection: props.collection,
				stageKey: props.stage,
			})}
			color={getStageColor({
				collection: props.collection,
				stageKey: props.stage ?? undefined,
			})}
		/>
	);

	// ----------------------------------------
	// Render
	return (
		<Show when={props.stage && stages().length > 0}>
			<Show
				when={props.editable}
				fallback={<span class="text-xs text-body">{current()}</span>}
			>
				<Menu.Root placement="bottom-end">
					<Menu.Trigger
						class="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-body transition-colors hover:bg-card-hover hover:text-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-60"
						disabled={props.loading}
						aria-label={T()("documents.workflow.stage")}
						title={T()("documents.workflow.stage")}
					>
						{current()}
						<FaSolidChevronDown size={8} class="text-icon" />
					</Menu.Trigger>
					<Menu.Content>
						<Menu.Label>{T()("documents.workflow.stage")}</Menu.Label>
						<Menu.RadioGroup
							value={props.stage ?? undefined}
							onChange={(stage) => {
								if (stage !== props.stage) props.onChange(stage);
							}}
						>
							<For each={stages()}>
								{(stage) => (
									<Menu.RadioItem value={stage.key}>
										<WorkflowStageOption
											label={
												helpers.getLocaleValue({
													value: stage.label,
													fallback: stage.key,
												}) || stage.key
											}
											color={stage.color ?? "grey"}
										/>
									</Menu.RadioItem>
								)}
							</For>
						</Menu.RadioGroup>
					</Menu.Content>
				</Menu.Root>
			</Show>
		</Show>
	);
};

export default WorkflowStageSelect;

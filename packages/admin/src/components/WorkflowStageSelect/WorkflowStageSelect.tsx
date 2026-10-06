import type { Collection } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import { stageVariants } from "@/components/DocumentSidebar/parts/WorkflowStageOption";
import StatusSelect from "@/components/StatusSelect/StatusSelect";
import T from "@/translations";
import helpers from "@/utils/helpers";

/**
 * A compact workflow stage picker. Shows the stage without a menu when it
 * can't be changed, and nothing when the collection has no workflow.
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
	const options = createMemo(() =>
		(props.collection?.publishing.workflow?.stages ?? []).map((stage) => ({
			value: stage.key,
			label:
				helpers.getLocaleValue({ value: stage.label, fallback: stage.key }) ||
				stage.key,
			indicator: stageVariants[stage.color ?? "grey"],
		})),
	);

	// ----------------------------------------
	// Render
	return (
		<Show when={options().length > 0 && props.stage}>
			{(stage) => (
				<StatusSelect
					value={stage()}
					options={options()}
					label={T()("documents.workflow.stage")}
					editable={props.editable}
					loading={props.loading}
					onChange={props.onChange}
				/>
			)}
		</Show>
	);
};

export default WorkflowStageSelect;

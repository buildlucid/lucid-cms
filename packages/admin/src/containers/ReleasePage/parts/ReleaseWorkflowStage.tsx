import type { Collection, ReleaseDocument } from "@types";
import { type Component, createMemo } from "solid-js";
import WorkflowStageSelect from "@/components/WorkflowStageSelect/WorkflowStageSelect";
import api from "@/services/api";

export const ReleaseWorkflowStage: Component<{
	document: ReleaseDocument;
	collection: Collection | undefined;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const update = api.documents.useUpdateWorkflow({ silent: true });

	// ----------------------------------------
	// Memos
	const proposalId = createMemo(() =>
		props.document.source === "latest" ? props.document.versionId : null,
	);

	// ----------------------------------------
	// Functions
	const updateStage = (stage: string) => {
		const versionId = proposalId();
		if (versionId === null) return;

		update.action.mutate({
			id: props.document.documentId,
			collectionKey: props.document.collectionKey,
			body: { stage, versionId },
		});
	};

	// ----------------------------------------
	// Render
	return (
		<WorkflowStageSelect
			collection={props.collection}
			stage={props.document.workflowStage}
			editable={proposalId() !== null && props.document.permissions.edit}
			loading={update.action.isPending}
			onChange={updateStage}
		/>
	);
};

import type { Collection, InternalCollectionDocument } from "@types";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import { DocumentDetails } from "./DocumentDetails";
import { PublishRequests } from "./PublishRequests";
import { Workflow } from "./Workflow";

export const Sidebar: Component<{
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	document: Accessor<InternalCollectionDocument | undefined>;
	documentId: Accessor<number | undefined>;
	disabled: Accessor<boolean>;
	mutations: UseDocumentMutations;
}> = (props) => {
	// ----------------------------------
	// Memos
	const hasWorkflow = createMemo(
		() =>
			props.collection()?.config.workflow !== undefined &&
			props.documentId() !== undefined &&
			props.document() !== undefined,
	);
	const hasPendingReleases = createMemo(
		() =>
			(props.collection()?.config.review?.requiredFor?.length ?? 0) > 0 ||
			props.collection()?.capabilities.scheduling === true,
	);

	// ----------------------------------
	// Render
	return (
		<aside class="w-full xl:w-80 shrink-0 sticky bg-card-base p-4 md:p-5 flex-col flex gap-5 rounded-tr-xl border-l border-border">
			<Workflow
				collection={props.collection}
				collectionKey={props.collectionKey}
				document={props.document}
				documentId={props.documentId}
				disabled={props.disabled}
				mutations={props.mutations}
			/>
			<Show when={hasWorkflow() && hasPendingReleases()}>
				<div class="border-t border-border" aria-hidden="true" />
			</Show>
			<PublishRequests
				collection={props.collection}
				collectionKey={props.collectionKey}
				documentId={props.documentId}
			/>
			<Show when={hasWorkflow() || hasPendingReleases()}>
				<div class="border-t border-border" aria-hidden="true" />
			</Show>
			<DocumentDetails
				collection={props.collection}
				document={props.document}
				documentId={props.documentId}
			/>
		</aside>
	);
};

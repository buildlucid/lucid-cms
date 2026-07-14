import type {
	Collection,
	DocumentVersionUpdateResponse,
	InternalCollectionDocument,
} from "@types";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import { DocumentDetails } from "./DocumentDetails";
import { PublishRequests } from "./PublishRequests";
import { Workflow } from "./Workflow";

export const Sidebar: Component<{
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	document: Accessor<InternalCollectionDocument | undefined>;
	autoSaveMetadata?: Accessor<DocumentVersionUpdateResponse | null>;
	documentId: Accessor<number | undefined>;
	disabled: Accessor<boolean>;
	mutations: UseDocumentMutations;
}> = (props) => {
	// ----------------------------------
	// Memos
	const hasWorkflow = createMemo(
		() =>
			props.collection()?.workflow !== undefined &&
			props.documentId() !== undefined &&
			props.document() !== undefined,
	);
	const hasPendingReleases = createMemo(
		() =>
			(props.collection()?.review?.requiredFor?.length ?? 0) > 0 ||
			props.collection()?.capabilities.scheduling === true,
	);

	// ----------------------------------
	// Render
	return (
		<aside class="w-full shrink-0 bg-card-base p-4 md:p-5 flex-col flex gap-5 rounded-t-xl border-t border-border xl:sticky xl:top-(--document-header-bar-height) xl:h-[calc(100vh-var(--document-header-bar-height))] xl:w-80 xl:self-start xl:overflow-y-auto xl:rounded-tl-none xl:border-t-0 xl:border-l">
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
				autoSaveMetadata={props.autoSaveMetadata}
				documentId={props.documentId}
			/>
		</aside>
	);
};

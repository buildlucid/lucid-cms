import type {
	Collection,
	DocumentVersionUpdateResponse,
	InternalCollectionDocument,
	Refs,
} from "@types";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import { Permissions } from "@/constants/permissions";
import type { UseDocumentMutations } from "@/hooks/useDocumentMutations/useDocumentMutations";
import userStore from "@/store/userStore/userStore";
import { DocumentDetails } from "./parts/DocumentDetails";
import { DocumentRequests } from "./parts/DocumentRequests";
import { Workflow } from "./parts/Workflow";

export const DocumentSidebar: Component<{
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	document: Accessor<InternalCollectionDocument | undefined>;
	refs: Accessor<Refs | undefined>;
	autoSaveMetadata?: Accessor<DocumentVersionUpdateResponse | null>;
	documentId: Accessor<number | undefined>;
	disabled: Accessor<boolean>;
	mutations: UseDocumentMutations;
	requestContext?: boolean;
}> = (props) => {
	// ----------------------------------
	// Memos
	const hasWorkflow = createMemo(
		() =>
			props.collection()?.publishing.workflow !== undefined &&
			props.documentId() !== undefined &&
			Boolean(props.document()?.workflow),
	);
	const hasPendingRequests = createMemo(
		() =>
			!props.requestContext &&
			userStore.get.hasPermission([Permissions.RequestsRead]).all &&
			props.documentId() !== undefined,
	);

	// ----------------------------------
	// Render
	return (
		<aside class="w-full shrink-0 bg-card p-4 md:p-5 flex-col flex gap-5 rounded-t-xl border-t border-border xl:sticky xl:top-(--document-header-bar-height) xl:h-[calc(100vh-var(--document-header-bar-height))] xl:w-82.5 xl:self-start xl:overflow-y-auto xl:rounded-tl-none xl:border-t-0 xl:border-l">
			<Workflow
				collection={props.collection}
				collectionKey={props.collectionKey}
				document={props.document}
				refs={props.refs}
				documentId={props.documentId}
				disabled={props.disabled}
				mutations={props.mutations}
			/>
			<Show when={hasWorkflow() && hasPendingRequests()}>
				<div class="border-t border-border" aria-hidden="true" />
			</Show>
			<Show when={hasPendingRequests()}>
				<DocumentRequests
					collectionKey={props.collectionKey}
					documentId={props.documentId}
				/>
			</Show>
			<Show when={hasWorkflow() || hasPendingRequests()}>
				<div class="border-t border-border" aria-hidden="true" />
			</Show>
			<DocumentDetails
				collection={props.collection}
				document={props.document}
				refs={props.refs}
				autoSaveMetadata={props.autoSaveMetadata}
				documentId={props.documentId}
			/>
		</aside>
	);
};

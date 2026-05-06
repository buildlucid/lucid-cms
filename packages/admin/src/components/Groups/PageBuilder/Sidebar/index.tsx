import type { Collection, InternalCollectionDocument } from "@types";
import type { Accessor, Component } from "solid-js";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
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
	// Render
	return (
		<aside class="w-full xl:w-80 shrink-0 border-t xl:border-t-0 xl:border-l border-border bg-background-base">
			<div class="sticky top-(--document-header-bar-height,0px) max-h-[calc(100vh-var(--document-header-bar-height,0px))] overflow-y-auto p-4 md:p-5">
				<Workflow
					collection={props.collection}
					collectionKey={props.collectionKey}
					document={props.document}
					documentId={props.documentId}
					disabled={props.disabled}
					mutations={props.mutations}
				/>
				<PublishRequests
					collection={props.collection}
					collectionKey={props.collectionKey}
					documentId={props.documentId}
				/>
			</div>
		</aside>
	);
};

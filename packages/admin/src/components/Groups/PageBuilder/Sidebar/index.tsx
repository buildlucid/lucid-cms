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
		<aside class="w-full xl:w-80 shrink-0 sticky bg-card-base p-4 md:p-5 flex-col flex gap-6 rounded-tr-xl border-l border-border">
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
		</aside>
	);
};

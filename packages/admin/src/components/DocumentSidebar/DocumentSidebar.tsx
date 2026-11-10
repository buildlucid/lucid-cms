import type {
	Collection,
	DocumentVersionUpdateResponse,
	InternalCollectionDocument,
	Refs,
} from "@types";
import classNames from "classnames";
import { type Accessor, type Component, Show } from "solid-js";
import DocumentSidebarSlots from "@/components/DocumentSidebarSlots/DocumentSidebarSlots";
import type { UseDocumentMutations } from "@/hooks/useDocumentMutations/useDocumentMutations";
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
	/** Places it, eg. as a column beside the fields. */
	class?: string;
	/** `lg` matches the fields' padding, for when it shows in their place. Defaults to `md`. */
	padding?: "md" | "lg";
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<aside
			class={classNames(
				"flex flex-col gap-5 p-4 [&>:empty]:hidden [&>:not(:empty)~:not(:empty)]:border-t [&>:not(:empty)~:not(:empty)]:border-border [&>:not(:empty)~:not(:empty)]:pt-5",
				props.padding === "lg" ? "md:p-6" : "md:p-5",
				props.class,
			)}
		>
			<DocumentSidebarSlots
				section="workflow"
				collectionKey={props.collectionKey()}
			>
				<Workflow
					collection={props.collection}
					collectionKey={props.collectionKey}
					document={props.document}
					refs={props.refs}
					documentId={props.documentId}
					disabled={props.disabled}
					mutations={props.mutations}
				/>
			</DocumentSidebarSlots>
			<DocumentSidebarSlots
				section="requests"
				collectionKey={props.collectionKey()}
			>
				<Show when={!props.requestContext}>
					<DocumentRequests
						collectionKey={props.collectionKey}
						documentId={props.documentId}
					/>
				</Show>
			</DocumentSidebarSlots>
			<DocumentSidebarSlots
				section="details"
				collectionKey={props.collectionKey()}
			>
				<DocumentDetails
					collection={props.collection}
					document={props.document}
					refs={props.refs}
					autoSaveMetadata={props.autoSaveMetadata}
					documentId={props.documentId}
				/>
			</DocumentSidebarSlots>
		</aside>
	);
};

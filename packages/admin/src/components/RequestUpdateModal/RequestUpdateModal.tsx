import type { RequestDetails } from "@types";
import type { Component } from "solid-js";
import RequestDocumentDraft from "@/components/RequestDocumentDraft/RequestDocumentDraft";
import RequestDocumentsModal from "@/components/RequestDocumentsModal/RequestDocumentsModal";
import T from "@/translations";
import { canAddToRequest } from "@/utils/requests";

/** Picks documents for a new update request, or for the update `request` passed in. Each gets a proposal of latest to edit. */
const RequestUpdateModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	request?: RequestDetails;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<RequestDocumentsModal<{ collectionKey: string; documentId: number }>
			open={props.open}
			setOpen={props.setOpen}
			type="update"
			request={props.request}
			copy={{
				title: T()("requests.create.update.title"),
				description: T()("requests.create.update.description"),
			}}
			canPick={(collection) =>
				canAddToRequest(collection, "update", props.request)
			}
			toDraft={(_document, _collection, ref) => ref}
			isReady={() => true}
			renderDraft={(draft) => (
				<RequestDocumentDraft
					draft={draft.draft}
					document={draft.document}
					collection={draft.collection}
					onRemove={draft.onRemove}
				/>
			)}
		/>
	);
};

export default RequestUpdateModal;

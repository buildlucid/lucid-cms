import type { RequestDetails } from "@types";
import type { Component } from "solid-js";
import RequestDocumentDraft from "@/components/RequestDocumentDraft/RequestDocumentDraft";
import RequestDocumentsModal from "@/components/RequestDocumentsModal/RequestDocumentsModal";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

/** Picks documents for a new delete request, or for the delete `request` passed in. */
const RequestDeleteModal: Component<{
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
			type="delete"
			request={props.request}
			copy={{
				title: T()("requests.create.delete.title"),
				description: T()("requests.create.delete.description"),
			}}
			canPick={(collection) =>
				collection.mode === "multiple" &&
				userStore.get.hasPermission([collection.permissions.read]).all &&
				userStore.get.hasPermission([
					collection.permissions.delete,
					collection.permissions.deleteRequest,
				]).some
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

export default RequestDeleteModal;

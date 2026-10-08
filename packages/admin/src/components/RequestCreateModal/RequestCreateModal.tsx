import type { RequestDetail, RequestDocumentInput } from "@types";
import type { Component } from "solid-js";
import RequestDocumentsModal from "@/components/RequestDocumentsModal/RequestDocumentsModal";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getDefaultTargets } from "@/utils/requests";
import RequestPublishDraft from "./parts/RequestPublishDraft";

const RequestCreateModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	/** Adds to this request instead of creating a new one. */
	request?: RequestDetail;
}> = (props) => (
	<RequestDocumentsModal<Required<RequestDocumentInput>>
		open={props.open}
		setOpen={props.setOpen}
		type="publish"
		request={props.request}
		copy={{
			title: T()("requests.create.title"),
			description: T()("requests.create.description"),
		}}
		canPick={(collection) =>
			collection.publishing.targets.length > 0 &&
			userStore.get.hasPermission([
				collection.permissions.read,
				collection.permissions.update,
			]).all
		}
		toDraft={(_document, collection, ref) => ({
			...ref,
			source: "latest",
			targets: getDefaultTargets(collection, "latest"),
		})}
		isReady={(draft) => draft.targets.length > 0}
		renderDraft={(draft) => <RequestPublishDraft {...draft} />}
	/>
);

export default RequestCreateModal;

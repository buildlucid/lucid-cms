import type { RequestDocumentInput } from "@lucidcms/types";
import type { RequestDetails } from "@types";
import type { Component } from "solid-js";
import RequestDocumentsModal from "@/components/RequestDocumentsModal/RequestDocumentsModal";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getDefaultTargets } from "@/utils/requests";
import RequestPublishDraft from "./parts/RequestPublishDraft";

/** Picks documents for a new publish request, or for the publish `request` passed in. */
const RequestPublishModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	/** Adds to this request instead of creating a new one. */
	request?: RequestDetails;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<RequestDocumentsModal<Required<RequestDocumentInput>>
			open={props.open}
			setOpen={props.setOpen}
			type="publish"
			request={props.request}
			copy={{
				title: T()("requests.create.publish.title"),
				description: T()("requests.create.publish.description"),
			}}
			canPick={(collection) =>
				collection.publishing.environments.length > 0 &&
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
};

export default RequestPublishModal;

import type { DocumentVersionType, ErrorResponse, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	collectionKey: string;
	versionId: number;
	body: {
		versionType: Exclude<DocumentVersionType, "revision">;
		bypassRevision?: boolean;
	};
}

export const promoteSingleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.id}/${params.versionId}/promote-version`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UsePromoteSingleProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	getCollectionName: () => string;
	getVersionType: Accessor<DocumentVersionType | undefined>;
}

const usePromoteSingle = (props: UsePromoteSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: promoteSingleReq,
		getSuccessToast: () => ({
			title: T()("promote_version_toast_title", {
				name: props.getCollectionName(),
			}),
			message: T()("promote_version_toast_message", {
				name: props.getCollectionName().toLowerCase(),
				versionType: props.getVersionType(),
			}),
		}),
		invalidates: ["documents.getMultiple", "documents.getSingle"],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default usePromoteSingle;

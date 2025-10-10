import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	collectionKey: string;
	body: {
		ids: Array<number>;
	};
}

export const restoreReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/api/v1/documents/${params.collectionKey}/restore`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseRestoreProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useRestore = (props?: UseRestoreProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: restoreReq,
		getSuccessToast: () => ({
			title: T()("document_restore_toast_title"),
			message: T()("document_restore_toast_message"),
		}),
		invalidates: ["documents.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRestore;

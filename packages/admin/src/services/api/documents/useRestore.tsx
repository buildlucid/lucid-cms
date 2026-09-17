import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	collectionKey: string;
	body: {
		ids: Array<number>;
	};
}

export const restoreReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/restore`,
		csrf: true,
		method: "POST",
		body: params.body,
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
			title: T()("toasts.documents.restore.title"),
			message: T()("toasts.documents.restore.message"),
		}),
		invalidates: [queryKeys.documents.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRestore;

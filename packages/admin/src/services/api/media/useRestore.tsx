import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	body: {
		ids: Array<number>;
	};
}

export const restoreReq = (params: Params) => {
	return request<ResponseBody>({
		url: "/lucid/api/v1/media/restore",
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
			title: T()("toasts.media.restore.title"),
			message: T()("toasts.media.restore.message"),
		}),
		invalidates: [
			queryKeys.media.all(),
			queryKeys.mediaFolders.list(),
			queryKeys.mediaFolders.hierarchy(),
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRestore;

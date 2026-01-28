import type { ResponseBody } from "@types";
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
			title: T()("media_restore_toast_title"),
			message: T()("media_restore_toast_message"),
		}),
		invalidates: [
			"media.getMultiple",
			"media.getSingle",
			"mediaFolders.getMultiple",
			"mediaFolders.getHierarchy",
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRestore;

import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	body: {
		ids: number[];
	};
}

export const deleteMultiplePermanentlyReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: "/lucid/api/v1/media/permanent",
		csrf: true,
		config: {
			method: "DELETE",
			body: params.body,
		},
	});
};

interface UseDeleteMultiplePermanentlyProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteMultiplePermanently = (
	props?: UseDeleteMultiplePermanentlyProps,
) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: deleteMultiplePermanentlyReq,
		getSuccessToast: () => ({
			title: T()("media_deleted_toast_title"),
			message: T()("media_deleted_toast_message"),
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

export default useDeleteMultiplePermanently;

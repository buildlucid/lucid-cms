import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	title: string;
	parentFolderId?: number | null;
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/api/v1/media/folders",
		csrf: true,
		config: {
			method: "POST",
			body: params,
		},
	});
};

interface UseCreateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useCreateSingle = (props?: UseCreateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: createSingleReq,
		getSuccessToast: () => ({
			title: T()("media_folder_create_toast_title"),
			message: T()("media_folder_create_toast_message"),
		}),
		invalidates: ["mediaFolders.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;

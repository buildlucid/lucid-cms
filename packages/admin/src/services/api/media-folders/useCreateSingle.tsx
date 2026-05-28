import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	title: string;
	parentFolderId?: number | null;
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/media/folders",
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
			title: T()("toasts.media.folder.create.title"),
			message: T()("toasts.media.folder.create.message"),
		}),
		invalidates: ["mediaFolders.getMultiple", "mediaFolders.getHierarchy"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;

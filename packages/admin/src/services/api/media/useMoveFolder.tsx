import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	id: number;
	body: {
		folderId: number | null;
	};
}

export const moveFolderReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/media/${params.id}/move`,
		csrf: true,
		config: {
			method: "PATCH",
			body: params.body,
		},
	});
};

interface UseMoveFolderProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useMoveFolder = (props?: UseMoveFolderProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: moveFolderReq,
		getSuccessToast: () => ({
			title: T()("update_toast_title", { name: T()("media") }),
			message: T()("media_update_toast_message"),
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

export default useMoveFolder;

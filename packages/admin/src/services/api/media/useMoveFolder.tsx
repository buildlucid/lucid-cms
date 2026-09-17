import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	body: {
		folderId: number | null;
	};
}

export const moveFolderReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/media/${params.id}/move`,
		csrf: true,
		method: "PATCH",
		body: params.body,
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
			title: T()("toasts.common.update.title", { name: T()("common.media") }),
			message: T()("toasts.media.update.message"),
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

export default useMoveFolder;

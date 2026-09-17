import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	body: {
		title?: string;
		parentFolderId?: number | null;
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/media/folders/${params.id}`,
		csrf: true,
		method: "PATCH",
		body: params.body,
	});
};

interface UseUpdateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateSingle = (props?: UseUpdateSingleProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: updateSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.update.title", {
				name: T()("common.folders"),
			}),
			message: T()("toasts.common.update.message", {
				name: T()("common.folders"),
			}),
		}),
		invalidates: [
			queryKeys.mediaFolders.list(),
			queryKeys.mediaFolders.hierarchy(),
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateSingle;

import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	id: number;
	body: {
		title?: string;
		parentFolderId?: number | null;
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/media/folders/${params.id}`,
		csrf: true,
		config: {
			method: "PATCH",
			body: params.body,
		},
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
			title: T()("update_toast_title", {
				name: T()("folders"),
			}),
			message: T()("update_toast_message", {
				name: T()("folders"),
			}),
		}),
		invalidates: ["mediaFolders.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateSingle;

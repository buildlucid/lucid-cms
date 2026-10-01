import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	body: {
		public: boolean;
		folderId?: number | null;
	};
}

export const removeOwnershipReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/media/${params.id}/remove-ownership`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

interface UseRemoveOwnershipProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useRemoveOwnership = (props?: UseRemoveOwnershipProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: removeOwnershipReq,
		getSuccessToast: () => ({
			title: T()("toasts.media.ownership.removed.title"),
			message: T()("toasts.media.ownership.removed.message"),
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

export default useRemoveOwnership;

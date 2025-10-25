import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, MediaShareLinkResponse } from "@types";

interface Params {
	mediaId: number;
	body: {
		name?: string;
		description?: string;
		password?: string;
		expiresAt?: string;
	};
}

interface Response {
	id: MediaShareLinkResponse["id"];
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<Response>>({
		url: `/api/v1/media/${params.mediaId}/share-links`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseCreateSingleProps {
	onSuccess?: (_data: ResponseBody<Response>) => void;
	onError?: () => void;
}

const useCreateSingle = (props?: UseCreateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<Response>>({
		mutationFn: createSingleReq,
		getSuccessToast: () => ({
			title: T()("media_share_link_create_toast_title"),
			message: T()("media_share_link_create_toast_message"),
		}),
		invalidates: ["mediaShareLinks.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;

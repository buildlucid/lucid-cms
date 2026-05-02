import type { ResponseBody, UploadSessionResponse } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	body: {
		fileName: string;
		mimeType: string;
		size: number;
	};
}

export const createProfilePictureUploadSessionReq = (params: Params) => {
	return request<ResponseBody<UploadSessionResponse>>({
		url: "/lucid/api/v1/account/profile-picture/upload-session",
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseCreateProfilePictureUploadSessionProps {
	onSuccess?: (_data: ResponseBody<UploadSessionResponse>) => void;
	onError?: () => void;
}

const useCreateProfilePictureUploadSession = (
	props?: UseCreateProfilePictureUploadSessionProps,
) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<UploadSessionResponse>
	>({
		mutationFn: createProfilePictureUploadSessionReq,
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateProfilePictureUploadSession;

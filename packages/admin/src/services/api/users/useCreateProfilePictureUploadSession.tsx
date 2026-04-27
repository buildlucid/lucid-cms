import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { UploadSessionResponse } from "../media/useCreateUploadSession";

interface Params {
	userId: number;
	body: {
		fileName: string;
		mimeType: string;
		size: number;
	};
}

export const createProfilePictureUploadSessionReq = (params: Params) => {
	return request<ResponseBody<UploadSessionResponse>>({
		url: `/lucid/api/v1/users/${params.userId}/profile-picture/upload-session`,
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

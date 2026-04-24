import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	userId: number;
	body: {
		fileName: string;
		mimeType: string;
	};
}

export const getProfilePicturePresignedUrlReq = (params: Params) => {
	return request<
		ResponseBody<{
			url: string;
			key: string;
			headers?: Record<string, string>;
		}>
	>({
		url: `/lucid/api/v1/users/${params.userId}/profile-picture/presigned-url`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseGetProfilePicturePresignedUrlProps {
	onSuccess?: (
		_data: ResponseBody<{
			url: string;
			key: string;
			headers?: Record<string, string>;
		}>,
	) => void;
	onError?: () => void;
}

const useGetProfilePicturePresignedUrl = (
	props?: UseGetProfilePicturePresignedUrlProps,
) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			url: string;
			key: string;
			headers?: Record<string, string>;
		}>
	>({
		mutationFn: getProfilePicturePresignedUrlReq,
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useGetProfilePicturePresignedUrl;

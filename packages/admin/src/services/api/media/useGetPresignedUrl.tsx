import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@lucidcms/core/types";

interface Params {
	body: {
		fileName: string;
		mimeType: string;
	};
}

export const getPresignedUrlReq = (params: Params) => {
	return request<
		ResponseBody<{
			url: string;
			key: string;
		}>
	>({
		url: "/api/v1/media/presigned-url",
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseUpdateSingleProps {
	onSuccess?: (
		_data: ResponseBody<{
			url: string;
			key: string;
		}>,
	) => void;
	onError?: () => void;
}

const useGetPresgnedUrl = (props?: UseUpdateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			url: string;
			key: string;
		}>
	>({
		mutationFn: getPresignedUrlReq,
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useGetPresgnedUrl;

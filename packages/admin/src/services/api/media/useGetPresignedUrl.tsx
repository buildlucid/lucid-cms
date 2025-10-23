import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	body: {
		fileName: string;
		mimeType: string;
		public: boolean;
	};
}

export const getPresignedUrlReq = (params: Params) => {
	return request<
		ResponseBody<{
			url: string;
			key: string;
			headers?: Record<string, string>;
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
			headers?: Record<string, string>;
		}>,
	) => void;
	onError?: () => void;
}

const useGetPresignedUrl = (props?: UseUpdateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			url: string;
			key: string;
			headers?: Record<string, string>;
		}>
	>({
		mutationFn: getPresignedUrlReq,
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useGetPresignedUrl;

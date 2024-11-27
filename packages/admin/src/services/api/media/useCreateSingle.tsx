import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, MediaResponse } from "@lucidcms/core/types";

interface Params {
	key?: string;
	fileName?: string;
	title: Array<{
		localeCode: string | null;
		value: string | null;
	}>;
	alt: Array<{
		localeCode: string | null;
		value: string | null;
	}>;
}
interface Response {
	id: MediaResponse["id"];
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<Response>>({
		url: "/api/v1/media",
		csrf: true,
		config: {
			method: "POST",
			body: params,
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
		invalidates: ["media.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;

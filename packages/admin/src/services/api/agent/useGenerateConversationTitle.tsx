import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = { id: string; openingId: number; originalTitle: string };

const useGenerateConversationTitle = (props?: {
	onSuccess?: (
		response: ResponseBody<{ title: string }>,
		params: Params,
	) => void;
}) =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<{ title: string }>>({
		mutationFn: (params) =>
			request<ResponseBody<{ title: string }>>({
				url: `/lucid/api/v1/agent/conversations/${params.id}/title/generate`,
				method: "POST",
			}),
		onSuccess: props?.onSuccess,
	});

export default useGenerateConversationTitle;

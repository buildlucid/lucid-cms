import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Response = ResponseBody<{ conversationId: string; runId: string }>;

const useRunRoutine = (props?: { onSuccess?: (response: Response) => void }) =>
	serviceHelpers.useMutationWrapper<{ id: string }, Response>({
		mutationFn: (params) =>
			request<Response>({
				url: `/lucid/api/v1/agent/routines/${params.id}/run`,
				method: "POST",
			}),
		invalidates: [queryKeys.agent.all()],
		onSuccess: props?.onSuccess,
	});

export default useRunRoutine;

import type { AgentMemory, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { MemoryBody } from "./useCreateMemory";

const useUpdateMemory = (props?: { onSuccess?: () => void }) =>
	serviceHelpers.useMutationWrapper<
		{ id: string; body: MemoryBody },
		ResponseBody<AgentMemory>
	>({
		mutationFn: (params) =>
			request<ResponseBody<AgentMemory>>({
				url: `/api/v1/agent/memories/${params.id}`,
				method: "PATCH",
				body: params.body,
			}),
		getSuccessToast: () => ({
			title: T()("toasts.agent.memory.updated.title"),
			message: T()("toasts.agent.memory.updated.message"),
		}),
		invalidates: [queryKeys.agent.memories()],
		onSuccess: props?.onSuccess,
	});

export default useUpdateMemory;

import type { AgentMemory, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type MemoryBody = Pick<AgentMemory, "scope" | "content">;

const useCreateMemory = (props?: { onSuccess?: () => void }) =>
	serviceHelpers.useMutationWrapper<MemoryBody, ResponseBody<AgentMemory>>({
		mutationFn: (body) =>
			request<ResponseBody<AgentMemory>>({
				url: "/api/v1/agent/memories",
				method: "POST",
				body,
			}),
		getSuccessToast: () => ({
			title: T()("toasts.agent.memory.created.title"),
			message: T()("toasts.agent.memory.created.message"),
		}),
		invalidates: [queryKeys.agent.memories()],
		onSuccess: props?.onSuccess,
	});

export default useCreateMemory;

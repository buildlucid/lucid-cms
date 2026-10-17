import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

const useDeleteMemories = (props?: { onSuccess?: () => void }) =>
	serviceHelpers.useMutationWrapper<{ ids: string[] }, unknown>({
		mutationFn: (body) =>
			request({
				url: "/api/v1/agent/memories",
				method: "DELETE",
				body,
			}),
		getSuccessToast: (_response, params) => ({
			title: T()(
				params.ids.length === 1
					? "toasts.agent.memory.deleted.title"
					: "toasts.agent.memories.deleted.title",
			),
			message: T()(
				params.ids.length === 1
					? "toasts.agent.memory.deleted.message"
					: "toasts.agent.memories.deleted.message",
			),
		}),
		invalidates: [queryKeys.agent.memories()],
		onSuccess: props?.onSuccess,
	});

export default useDeleteMemories;

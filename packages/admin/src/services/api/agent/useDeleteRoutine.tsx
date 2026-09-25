import { useQueryClient } from "@tanstack/solid-query";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

const useDeleteRoutine = (props?: { onSuccess?: () => void }) => {
	const queryClient = useQueryClient();

	return serviceHelpers.useMutationWrapper<{ id: string }, unknown>({
		mutationFn: (params) =>
			request({
				url: `/lucid/api/v1/agent/routines/${params.id}`,
				method: "DELETE",
			}),
		getSuccessToast: () => ({
			title: T()("toasts.agent.routine.deleted.title"),
			message: T()("toasts.agent.routine.deleted.message"),
		}),
		invalidates: [queryKeys.agent.routines(), queryKeys.agent.conversations()],
		onSuccess: (_response, params) => {
			//* drop it before the list refetches so it is not requested again
			queryClient.removeQueries({
				queryKey: queryKeys.agent.routine(params.id),
			});
			props?.onSuccess?.();
		},
	});
};

export default useDeleteRoutine;

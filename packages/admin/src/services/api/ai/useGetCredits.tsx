import { useQuery } from "@tanstack/solid-query";
import type { AiCredits, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

const useGetCredits = (
	params: {
		enabled?: Accessor<boolean>;
		/** Leave false where the caller shows its own error, such as a Home widget. */
		displayErrorToast?: boolean;
	} = {},
) =>
	useQuery(() => ({
		queryKey: queryKeys.ai.credits(),
		queryFn: () =>
			request<ResponseBody<AiCredits>>({
				url: "/lucid/api/v1/ai/credits",
				displayErrorToast: params.displayErrorToast,
			}),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		enabled: params.enabled?.() ?? true,
	}));

export default useGetCredits;

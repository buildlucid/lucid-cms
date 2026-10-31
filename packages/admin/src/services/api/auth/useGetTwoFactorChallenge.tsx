import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, TwoFactorChallenge } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

// oxlint-disable-next-line typescript/no-empty-object-type
interface QueryParams {}

/** Reads which two-factor step the current login is waiting on. Errors once the login has timed out. */
const useGetTwoFactorChallenge = (params: QueryHook<QueryParams>) => {
	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.auth.twoFactorChallenge(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<TwoFactorChallenge>>({
				url: "/api/v1/auth/two-factor",
				method: "GET",
				//* the page shows a timed out state instead
				displayErrorToast: false,
			}),
		retry: 0,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
		get refetchOnWindowFocus() {
			return params.refetchOnWindowFocus ?? false;
		},
	}));
};

export default useGetTwoFactorChallenge;

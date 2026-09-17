import { useLocation, useNavigate } from "@solidjs/router";
import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, User } from "@types";
import { createEffect } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import userStore from "@/store/userStore/userStore";
import type { QueryHook } from "@/types/utils";
import getLoginRedirectURL from "@/utils/login-route";
import request, { type RequestParams } from "@/utils/request";

// biome-ignore lint/suspicious/noEmptyInterface: explanation
interface QueryParams {}

export const getAuthenticatedUserReq = (
	options: Pick<RequestParams, "signal" | "displayErrorToast"> = {},
) =>
	request<ResponseBody<User>>({
		url: "/lucid/api/v1/account",
		...options,
	});

const useGetAuthenticatedUser = (
	params: QueryHook<QueryParams>,
	options?: {
		authLayout?: boolean;
	},
) => {
	const navigate = useNavigate();
	const location = useLocation();

	const query = useQuery(() => ({
		queryKey: queryKeys.account.session(),
		queryFn: ({ signal }) =>
			getAuthenticatedUserReq({ signal, displayErrorToast: false }),
		retry: false,
		staleTime: 30_000,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));

	createEffect(() => {
		if (query.isSuccess) {
			userStore.set("user", query.data.data);
		}
		if (query.isError) {
			if (options?.authLayout) {
				return;
			}
			navigate(
				getLoginRedirectURL(
					`${location.pathname}${location.search}${location.hash}`,
				),
				{
					replace: true,
				},
			);
		}
	});

	return query;
};

export default useGetAuthenticatedUser;

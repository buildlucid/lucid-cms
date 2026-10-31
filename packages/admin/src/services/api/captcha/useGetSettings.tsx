import { useQuery } from "@tanstack/solid-query";
import type { CaptchaSettings, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

const useGetSettings = () => {
	return useQuery(() => ({
		queryKey: queryKeys.captcha.settings(),
		queryFn: () =>
			request<ResponseBody<CaptchaSettings | null>>({
				url: "/api/v1/captcha",
				method: "GET",
			}),
		retry: 0,
		refetchOnWindowFocus: false,
	}));
};

export default useGetSettings;

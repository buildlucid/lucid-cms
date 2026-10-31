import { useLocation, useNavigate } from "@solidjs/router";
import { TbOutlineKeyOff } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	Match,
	Switch,
} from "solid-js";
import AuthSkeleton from "@/components/AuthSkeleton/AuthSkeleton";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import ResetPasswordForm from "@/components/ResetPasswordForm/ResetPasswordForm";
import ThemeLogoIcon from "@/components/ThemeLogoIcon/ThemeLogoIcon";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";

const ResetPasswordPage: Component = () => {
	// ----------------------------------------
	// State
	usePageTitle(() => T()("routes.auth.reset.password.title"));
	const location = useLocation();
	const navigate = useNavigate();

	// get token from url
	const urlParams = new URLSearchParams(location.search);
	const token = urlParams.get("token");

	if (!token) {
		navigate("/admin/login");
	}

	// ----------------------------------------
	// Queries / Mutations
	const providers = api.auth.useGetProviders({
		queryParams: {},
	});
	//* pages with captcha forms wait for its settings, so the widget's space is there from the first paint
	const captchaSettings = api.captcha.useGetSettings();
	const checkToken = api.account.useVerifyResetToken({
		queryParams: {
			location: {
				token: token as string,
			},
		},
		enabled: () => token !== null,
	});

	// ----------------------------------------
	// Memos
	const isLoading = createMemo(
		() =>
			providers.isLoading || checkToken.isLoading || captchaSettings.isPending,
	);
	const isError = createMemo(() => providers.isError || checkToken.isError);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (providers.isSuccess && providers.data?.data.disablePassword === true) {
			navigate("/admin/login");
		}
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={isLoading()}>
				<AuthSkeleton fields={2} />
			</Match>
			<Match when={isError()}>
				<ErrorState
					icon={<TbOutlineKeyOff />}
					title={T()("auth.tokens.invalid.title")}
					description={T()("auth.tokens.invalid.description")}
					actions={
						<Link variant="primary" size="sm" href="/admin/login">
							{T()("common.back.to.login")}
						</Link>
					}
				/>
			</Match>
			<Match
				when={
					checkToken.isSuccess &&
					providers.isSuccess &&
					providers.data?.data.disablePassword === false
				}
			>
				<ThemeLogoIcon class="h-8 mx-auto mb-6" />
				<h1 class="mb-1 text-center">
					{T()("routes.auth.reset.password.title")}
				</h1>
				<p class="text-center max-w-sm mx-auto">
					{T()("routes.auth.reset.password.description")}
				</p>
				<div class="my-10">
					<ResetPasswordForm token={token as string} />
				</div>
			</Match>
		</Switch>
	);
};

export default ResetPasswordPage;

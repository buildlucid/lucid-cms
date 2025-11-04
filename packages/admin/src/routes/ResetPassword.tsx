import notifyIllustration from "@assets/illustrations/notify.svg";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useLocation, useNavigate } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createMemo,
	Match,
	Switch,
} from "solid-js";
import ResetPasswordForm from "@/components/Forms/Auth/ResetPasswordForm";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import Spinner from "@/components/Partials/Spinner";
import api from "@/services/api";
import T from "@/translations";

const ResetPasswordRoute: Component = () => {
	// ----------------------------------------
	// State
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
		() => providers.isLoading || checkToken.isLoading,
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
				<div class="flex items-center justify-center h-full">
					<Spinner size="sm" />
				</div>
			</Match>
			<Match when={isError()}>
				<ErrorBlock
					content={{
						image: notifyIllustration,
						title: T()("token_provided_invalid"),
						description: T()("token_provided_invalid_description"),
					}}
					link={{
						text: T()("back_to_login"),
						href: "/admin/login",
					}}
				/>
			</Match>
			<Match
				when={
					checkToken.isSuccess &&
					providers.isSuccess &&
					providers.data?.data.disablePassword === false
				}
			>
				<img src={LogoIcon} alt="Lucid CMS Logo" class="h-10 mx-auto mb-6" />
				<h1 class="mb-1 text-center">{T()("reset_password_route_title")}</h1>
				<p class="text-center max-w-sm mx-auto">
					{T()("reset_password_route_description")}
				</p>
				<div class="my-10">
					<ResetPasswordForm token={token as string} />
				</div>
			</Match>
		</Switch>
	);
};

export default ResetPasswordRoute;

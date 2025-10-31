import notifyIllustration from "@assets/illustrations/notify.svg";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useLocation, useNavigate } from "@solidjs/router";
import { type Component, Match, Switch } from "solid-js";
import ResetPasswordForm from "@/components/Forms/Auth/ResetPasswordForm";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import FullPageLoading from "@/components/Partials/FullPageLoading";
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
	const checkToken = api.account.useVerifyResetToken({
		queryParams: {
			location: {
				token: token as string,
			},
		},
		enabled: () => token !== null,
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={checkToken.isLoading}>
				<FullPageLoading />
			</Match>
			<Match when={checkToken.isError}>
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
			<Match when={checkToken.isSuccess}>
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

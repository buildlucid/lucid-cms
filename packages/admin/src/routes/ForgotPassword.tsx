import notifyIllustration from "@assets/illustrations/notify.svg";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useNavigate } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createMemo,
	Match,
	Switch,
} from "solid-js";
import ForgotPasswordForm from "@/components/Forms/Auth/ForgotPasswordForm";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import Spinner from "@/components/Partials/Spinner";
import api from "@/services/api";
import T from "@/translations";

const ForgotPasswordRoute: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();

	// ----------------------------------------
	// Queries
	const providers = api.auth.useGetProviders({
		queryParams: {},
	});

	// ----------------------------------------
	// Memos
	const isLoading = createMemo(() => providers.isLoading);
	const isError = createMemo(() => providers.isError);
	const isSuccess = createMemo(() => providers.isSuccess);

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
						title: T()("error_title"),
						description: T()("error_message"),
					}}
				/>
			</Match>
			<Match
				when={isSuccess() && providers.data?.data.disablePassword === false}
			>
				<img src={LogoIcon} alt="Lucid CMS Logo" class="h-10 mx-auto mb-6" />
				<h1 class="mb-1 text-center">{T()("forgot_password_route_title")}</h1>
				<p class="text-center max-w-sm mx-auto">
					{T()("forgot_password_route_description")}
				</p>
				<div class="my-10">
					<ForgotPasswordForm showBackToLogin={true} />
				</div>
			</Match>
		</Switch>
	);
};

export default ForgotPasswordRoute;

import { useNavigate } from "@solidjs/router";
import { TbOutlineAlertTriangle } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	Match,
	Switch,
} from "solid-js";
import ErrorState from "@/components/ErrorState/ErrorState";
import ForgotPasswordForm from "@/components/ForgotPasswordForm/ForgotPasswordForm";
import Spinner from "@/components/Spinner/Spinner";
import ThemeLogoIcon from "@/components/ThemeLogoIcon/ThemeLogoIcon";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";

const ForgotPasswordPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.auth.forgot.password.title"));
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
			navigate("/lucid/login");
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
				<ErrorState
					icon={<TbOutlineAlertTriangle />}
					title={T()("errors.generic.title")}
					description={T()("errors.generic.message")}
				/>
			</Match>
			<Match
				when={isSuccess() && providers.data?.data.disablePassword === false}
			>
				<ThemeLogoIcon class="h-10 mx-auto mb-6" />
				<h1 class="mb-1 text-center">
					{T()("routes.auth.forgot.password.title")}
				</h1>
				<p class="text-center max-w-sm mx-auto">
					{T()("routes.auth.forgot.password.description")}
				</p>
				<div class="my-10">
					<ForgotPasswordForm showBackToLogin={true} />
				</div>
			</Match>
		</Switch>
	);
};

export default ForgotPasswordPage;

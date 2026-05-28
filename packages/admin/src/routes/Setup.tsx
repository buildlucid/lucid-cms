import notifyIllustration from "@assets/illustrations/notify.svg";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useNavigate } from "@solidjs/router";
import { type Component, createEffect, Match, Switch } from "solid-js";
import SetupForm from "@/components/Forms/Auth/SetupForm";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import Spinner from "@/components/Partials/Spinner";
import api from "@/services/api";
import T from "@/translations";

const SetupRoute: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();

	// ----------------------------------------
	// Queries
	const setupRequired = api.auth.useSetupRequired({
		queryParams: {},
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (setupRequired.isSuccess && !setupRequired.data.data.setupRequired) {
			navigate("/lucid/login");
		}
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={setupRequired.isLoading}>
				<div class="flex items-center justify-center h-full">
					<Spinner size="sm" />
				</div>
			</Match>
			<Match when={setupRequired.isError}>
				<ErrorBlock
					content={{
						image: notifyIllustration,
						title: T()("errors.generic.title"),
						description: T()("errors.generic.message"),
					}}
					link={{
						text: T()("common.back.to.login"),
						href: "/lucid/login",
					}}
				/>
			</Match>
			<Match
				when={setupRequired.isSuccess && setupRequired.data.data.setupRequired}
			>
				<div class="mb-10 text-center">
					<img src={LogoIcon} alt="Lucid CMS Logo" class="h-10 mx-auto mb-6" />
					<h1 class="mb-1">{T()("routes.auth.setup.title")}</h1>
					<p class="max-w-sm mx-auto">{T()("routes.auth.setup.description")}</p>
				</div>
				<SetupForm />
			</Match>
		</Switch>
	);
};

export default SetupRoute;

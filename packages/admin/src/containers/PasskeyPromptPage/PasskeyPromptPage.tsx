import { useLocation, useNavigate } from "@solidjs/router";
import { TbOutlineFingerprint } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	Match,
	Switch,
} from "solid-js";
import AuthSkeleton from "@/components/AuthSkeleton/AuthSkeleton";
import Button from "@/components/Button/Button";
import HaloIcon from "@/components/HaloIcon/HaloIcon";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";
import { getLoginReturnPath } from "@/utils/login-route";
import { snoozePasskeyPrompt } from "@/utils/passkeys";

/** Suggests adding a passkey after login. Skips users who already have one or cannot add one. */
const PasskeyPromptPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.auth.passkey.prompt.page.title"));
	const location = useLocation();
	const navigate = useNavigate();

	// ----------------------------------------
	// Queries
	const user = api.account.useGetAuthenticatedUser({
		queryParams: {},
	});
	const providers = api.auth.useGetProviders({
		queryParams: {},
	});

	// ----------------------------------------
	// Mutations
	const createPasskey = api.account.useCreatePasskey({
		onSuccess: () => continueOn(),
	});

	// ----------------------------------------
	// Memos
	const shouldAsk = createMemo(
		() =>
			providers.data?.data.passkeys === true &&
			user.data?.data.passkeys?.length === 0,
	);

	// ----------------------------------------
	// Functions
	const continueOn = () => {
		navigate(getLoginReturnPath(location.search), { replace: true });
	};
	const skip = () => {
		snoozePasskeyPrompt();
		continueOn();
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!user.isSuccess || providers.isLoading) return;
		//* there's nothing to ask, so this browser skips the stop for a while
		if (!shouldAsk()) skip();
	});

	// ----------------------------------------
	// Render
	return (
		<div class="mx-auto w-full max-w-130">
			<Switch fallback={<AuthSkeleton fields={0} />}>
				<Match when={shouldAsk()}>
					<HaloIcon class="mx-auto mb-6">
						<TbOutlineFingerprint />
					</HaloIcon>
					<h1 class="mb-1 text-center">
						{T()("routes.auth.passkey.prompt.title")}
					</h1>
					<p class="text-center max-w-sm mx-auto">
						{T()("routes.auth.passkey.prompt.description")}
					</p>
					<div class="my-10">
						<Button
							type="button"
							variant="primary"
							size="lg"
							class="w-full"
							loading={createPasskey.action.isPending}
							onClick={() => createPasskey.action.mutate()}
						>
							{T()("routes.auth.passkey.prompt.add.action")}
						</Button>
						<button
							type="button"
							class="block mx-auto mt-6 text-center text-sm hover:text-primary-hover duration-200 transition-colors disabled:opacity-50"
							disabled={createPasskey.action.isPending}
							onClick={skip}
						>
							{T()("routes.auth.passkey.prompt.skip.action")}
						</button>
					</div>
				</Match>
			</Switch>
		</div>
	);
};

export default PasskeyPromptPage;

import notifyIllustration from "@assets/illustrations/notify.svg";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useLocation, useNavigate } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import Spinner from "@/components/Partials/Spinner";
import constants from "@/constants";
import api from "@/services/api";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

const AcceptInvitationRoute: Component = () => {
	// ----------------------------------------
	// State
	const location = useLocation();
	const navigate = useNavigate();
	const [password, setPassword] = createSignal("");
	const [passwordConfirmation, setPasswordConfirmation] = createSignal("");

	// ---------------------------------------
	// Memos
	const token = createMemo(() => {
		const urlParams = new URLSearchParams(location.search);
		return urlParams.get("token");
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const urlParams = new URLSearchParams(location.search);

		if (!token()) {
			navigate("/admin/login");
		}

		const errorName = urlParams.get(constants.errorQueryParams.errorName);
		const errorMessage = urlParams.get(constants.errorQueryParams.errorMessage);

		if (errorName || errorMessage) {
			spawnToast({
				title: errorName ?? T()("error_title"),
				message: errorMessage ?? undefined,
				status: "error",
			});
			urlParams.delete(constants.errorQueryParams.errorName);
			urlParams.delete(constants.errorQueryParams.errorMessage);

			navigate(
				`${location.pathname}${urlParams.size > 0 ? `?${urlParams.toString()}` : ""}`,
			);
		}
	});

	// ----------------------------------------
	// Queries / Mutations
	const validateInvitation = api.auth.useValidateInvitation({
		queryParams: {
			location: {
				token: token() as string,
			},
		},
		enabled: () => token() !== null,
	});
	const providers = api.auth.useGetProviders({
		queryParams: {},
		enabled: () => token() !== null,
	});
	const initiateProvider = api.auth.useInitiateProvider();
	const acceptInvitation = api.auth.useAcceptInvitation();

	// ----------------------------------------
	// Handlers
	const handleAcceptWithPassword = async (e: Event) => {
		e.preventDefault();
		const inviteToken = token();
		if (!inviteToken) return;
		await acceptInvitation.action.mutateAsync({
			token: inviteToken,
			body: {
				password: password(),
				passwordConfirmation: passwordConfirmation(),
			},
		});
	};
	const handleInitiate = async (providerKey: string) => {
		const inviteToken = token();
		if (!inviteToken) return;
		await initiateProvider.action.mutateAsync({
			providerKey,
			body: {
				invitationToken: inviteToken,
				actionType: "invitation",
			},
		});
	};

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={validateInvitation.isLoading || providers.isLoading}>
				<div class="flex items-center justify-center h-full">
					<Spinner size="sm" />
				</div>
			</Match>
			<Match
				when={
					validateInvitation.isError ||
					(validateInvitation.isSuccess &&
						validateInvitation.data?.data.valid === false)
				}
			>
				<ErrorBlock
					content={{
						image: notifyIllustration,
						title: "Invalid invitation token",
						description:
							"The invitation link is invalid or has expired. Please request a new invitation.",
					}}
					link={{
						text: "Back to login",
						href: "/admin/login",
					}}
				/>
			</Match>
			<Match when={validateInvitation.isSuccess && providers.isSuccess}>
				<img src={LogoIcon} alt="Lucid CMS Logo" class="h-10 mx-auto mb-6" />
				<h1 class="mb-1 text-center">Accept invitation</h1>
				<p class="text-center max-w-sm mx-auto">
					Choose a provider or accept by setting a password.
				</p>

				<div class="my-8">
					<h2 class="mb-3 text-center">Sign in with a provider</h2>
					<div class="flex flex-col gap-2 items-center">
						<For each={providers.data?.data.providers ?? []}>
							{(p) => (
								<button
									type="button"
									class="px-4 py-2 border rounded"
									onClick={[handleInitiate, p.key]}
									disabled={initiateProvider.action.isPending}
								>
									Continue with {p.name}
								</button>
							)}
						</For>
					</div>
				</div>

				<Show when={providers.data?.data.disablePassword === false}>
					<div class="my-8">
						<h2 class="mb-3 text-center">Accept with password</h2>
						<form
							class="flex flex-col gap-3 max-w-sm mx-auto"
							onSubmit={handleAcceptWithPassword}
						>
							<input
								type="password"
								placeholder="Password"
								value={password()}
								onInput={(e) => setPassword(e.currentTarget.value)}
								class="px-3 py-2 border rounded"
								required
							/>
							<input
								type="password"
								placeholder="Confirm password"
								value={passwordConfirmation()}
								onInput={(e) => setPasswordConfirmation(e.currentTarget.value)}
								class="px-3 py-2 border rounded"
								required
							/>
							<button
								type="submit"
								class="px-4 py-2 border rounded"
								disabled={acceptInvitation.action.isPending}
							>
								Accept invitation
							</button>
						</form>
					</div>
				</Show>
			</Match>
		</Switch>
	);
};

export default AcceptInvitationRoute;

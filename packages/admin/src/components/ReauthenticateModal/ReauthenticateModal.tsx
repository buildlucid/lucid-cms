import { useLocation } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Match,
	on,
	Show,
	Switch,
} from "solid-js";
import Button from "@/components/Button/Button";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import Tabs from "@/components/Tabs/Tabs";
import TwoFactorProofField, {
	isTwoFactorProofComplete,
	type TwoFactorProofMethod,
	toTwoFactorProof,
} from "@/components/TwoFactorProofField/TwoFactorProofField";
import api from "@/services/api";
import reauthenticationStore from "@/store/reauthenticationStore/reauthenticationStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import getLoginRedirectURL from "@/utils/login-route";

type Method = "password" | "app" | "passkey";

/**
 * Asks the user to confirm it's them when a change needs a recent login, such as adding a passkey.
 * Requests open it themselves, and are sent again once the user confirms.
 */
const ReauthenticateModal: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	//* empty until the user picks a tab, so the default follows the account once it loads
	const [chosenMethod, setChosenMethod] = createSignal<Method>();
	const [codeMethod, setCodeMethod] =
		createSignal<TwoFactorProofMethod>("code");
	const [password, setPassword] = createSignal("");
	const [code, setCode] = createSignal("");

	// ----------------------------------------
	// Queries
	const providers = api.auth.useGetProviders({
		queryParams: {},
	});

	// ----------------------------------------
	// Mutations
	const reauthenticate = api.account.useReauthenticate({
		onSuccess: () => reauthenticationStore.finish(true),
	});
	const logout = api.auth.useLogout({
		loginPath: () =>
			getLoginRedirectURL(`${location.pathname}${location.search}`),
	});

	// ----------------------------------------
	// Memos
	const user = createMemo(() => userStore.get.user);
	const methods = createMemo(() => {
		const available: Method[] = [];
		if (
			providers.data?.data.disablePassword === false &&
			user()?.hasPassword === true
		) {
			available.push("password");
		}
		if (user()?.twoFactor?.enabled === true) available.push("app");
		if (
			providers.data?.data.passkeys === true &&
			(user()?.passkeys?.length ?? 0) > 0
		) {
			available.push("passkey");
		}
		return available;
	});
	const method = createMemo<Method | undefined>(() => {
		const chosen = chosenMethod();
		return chosen !== undefined && methods().includes(chosen)
			? chosen
			: methods()[0];
	});
	const tabs = createMemo(() =>
		methods().map((value) => ({
			value,
			label: T()(`modals.account.reauthenticate.tabs.${value}`),
		})),
	);
	const canSubmit = createMemo(() => {
		if (reauthenticate.action.isPending) return false;
		switch (method()) {
			case "password":
				return password().length > 0;
			case "app":
				return isTwoFactorProofComplete(codeMethod(), code());
			case "passkey":
				return true;
			default:
				return false;
		}
	});

	// ----------------------------------------
	// Functions
	const submit = () => {
		if (!canSubmit()) return;
		switch (method()) {
			case "password":
				reauthenticate.action.mutate({ password: password() });
				break;
			case "app":
				reauthenticate.action.mutate(toTwoFactorProof(codeMethod(), code()));
				break;
			case "passkey":
				reauthenticate.action.mutate({ passkey: true });
				break;
		}
	};
	const logInAgain = () => {
		reauthenticationStore.finish(false);
		logout.action.mutate({});
	};

	// ----------------------------------------
	// Effects
	createEffect(
		on(reauthenticationStore.isOpen, (open) => {
			if (!open) return;
			reauthenticate.reset();
			setChosenMethod(undefined);
			setCodeMethod("code");
			setPassword("");
			setCode("");
		}),
	);
	createEffect(
		on(reauthenticate.errors, (errors) => {
			if (errors) setCode("");
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={reauthenticationStore.isOpen()}
			onOpenChange={(open) => {
				if (!open) reauthenticationStore.finish(false);
			}}
			above={
				<Show when={tabs().length > 1}>
					<Tabs.Root
						stretch={true}
						value={method()}
						onChange={(value) => setChosenMethod(value as Method)}
						items={tabs()}
					/>
				</Show>
			}
		>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{T()("modals.account.reauthenticate.title")}
					</Modal.Title>
					<Modal.Description>
						{method() === undefined
							? T()("modals.account.reauthenticate.log.in.description")
							: T()("modals.account.reauthenticate.description")}
					</Modal.Description>
				</Modal.Header>
				<Show when={method()}>
					{(current) => (
						<Modal.Body class="flex flex-col">
							<Switch>
								<Match when={current() === "password"}>
									<Input
										id="reauthenticatePassword"
										name="password"
										type="password"
										label={T()("common.password")}
										value={password()}
										onChange={setPassword}
										autocomplete="current-password"
										autofocus={true}
										required={true}
										errors={getBodyError("password", reauthenticate.errors)}
									/>
								</Match>
								<Match when={current() === "app"}>
									<TwoFactorProofField
										theme="basic"
										method={codeMethod()}
										onMethodChange={setCodeMethod}
										value={code()}
										onChange={(next) => {
											setCode(next);
											if (codeMethod() === "code") submit();
										}}
										errors={reauthenticate.errors}
										disabled={reauthenticate.action.isPending}
									/>
								</Match>
								<Match when={current() === "passkey"}>
									<p class="text-sm text-body">
										{T()("modals.account.reauthenticate.passkey.description")}
									</p>
								</Match>
							</Switch>
						</Modal.Body>
					)}
				</Show>
				<Modal.Footer>
					<Show when={method() !== undefined}>
						<button
							type="button"
							class="text-sm hover:text-primary-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
							disabled={reauthenticate.action.isPending}
							onClick={logInAgain}
						>
							{T()("modals.account.reauthenticate.log.in.again")}
						</button>
					</Show>
					<Modal.Actions>
						<Button
							type="button"
							variant="outline"
							size="md"
							disabled={reauthenticate.action.isPending}
							onClick={() => reauthenticationStore.finish(false)}
						>
							{T()("common.cancel")}
						</Button>
						<Show
							when={method() !== undefined}
							fallback={
								<Button
									type="button"
									variant="primary"
									size="md"
									loading={logout.action.isPending}
									onClick={logInAgain}
								>
									{T()("modals.account.reauthenticate.log.in.again.submit")}
								</Button>
							}
						>
							<Button
								type="submit"
								variant="primary"
								size="md"
								loading={reauthenticate.action.isPending}
								disabled={!canSubmit()}
							>
								{T()("common.confirm")}
							</Button>
						</Show>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default ReauthenticateModal;

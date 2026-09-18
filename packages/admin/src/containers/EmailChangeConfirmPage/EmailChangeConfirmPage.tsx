import notifyIllustration from "@assets/illustrations/notify.svg?url";
import { useLocation } from "@solidjs/router";
import {
	type Component,
	createMemo,
	createSignal,
	Match,
	Switch,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorBlock from "@/components/ErrorBlock/ErrorBlock";
import Link from "@/components/Link/Link";
import Spinner from "@/components/Spinner/Spinner";
import ThemeLogoIcon from "@/components/ThemeLogoIcon/ThemeLogoIcon";
import api from "@/services/api";
import T from "@/translations";

const EmailChangeConfirmPage: Component = () => {
	// ---------------------------------------
	// State & Hooks
	const location = useLocation();
	const [completed, setCompleted] = createSignal(false);

	// ---------------------------------------
	// Memos
	const token = createMemo(() => {
		const urlParams = new URLSearchParams(location.search);
		return urlParams.get("token");
	});

	// ---------------------------------------
	// Queries & Mutations
	const checkToken = api.account.useVerifyEmailChangeConfirm({
		queryParams: {
			location: {
				token: token() as string,
			},
		},
		enabled: () => token() !== null,
	});
	const confirmEmailChange = api.account.useConfirmEmailChange({
		onSuccess: () => {
			setCompleted(true);
		},
	});

	// ---------------------------------------
	// Memos
	const isInvalid = createMemo(() => token() === null || checkToken.isError);

	// ---------------------------------------
	// Render
	return (
		<Switch>
			<Match when={token() !== null && checkToken.isLoading}>
				<div class="flex items-center justify-center h-full">
					<Spinner size="sm" />
				</div>
			</Match>
			<Match when={isInvalid()}>
				<ErrorBlock
					content={{
						image: notifyIllustration,
						title: T()("auth.email.change.token.invalid.title"),
						description: T()("auth.email.change.token.invalid.description"),
					}}
					link={{
						text: T()("common.back.to.login"),
						href: "/lucid/login",
					}}
				/>
			</Match>
			<Match when={completed()}>
				<div class="text-center max-w-sm mx-auto">
					<ThemeLogoIcon class="h-10 mx-auto mb-6" />
					<h1 class="mb-1">
						{T()("routes.auth.email.change.confirmed.title")}
					</h1>
					<p>{T()("routes.auth.email.change.confirmed.description")}</p>
					<Link variant="primary" size="md" href="/lucid/login" class="mt-8">
						{T()("common.back.to.login")}
					</Link>
				</div>
			</Match>
			<Match when={checkToken.isSuccess}>
				<div class="text-center max-w-sm mx-auto">
					<ThemeLogoIcon class="h-10 mx-auto mb-6" />
					<h1 class="mb-1">{T()("routes.auth.email.change.confirm.title")}</h1>
					<p>{T()("routes.auth.email.change.confirm.description")}</p>
					<div class="mt-8 flex justify-center">
						<Button
							variant="primary"
							size="md"
							type="button"
							loading={confirmEmailChange.action.isPending}
							onClick={() => {
								const validToken = token();
								if (!validToken) return;
								confirmEmailChange.action.mutate({
									token: validToken,
								});
							}}
						>
							{T()("auth.email.change.confirm.action")}
						</Button>
					</div>
				</div>
			</Match>
		</Switch>
	);
};

export default EmailChangeConfirmPage;

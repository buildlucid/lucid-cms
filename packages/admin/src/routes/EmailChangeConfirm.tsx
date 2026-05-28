import notifyIllustration from "@assets/illustrations/notify.svg";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useLocation } from "@solidjs/router";
import {
	type Component,
	createMemo,
	createSignal,
	Match,
	Switch,
} from "solid-js";
import Button from "@/components/Partials/Button";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import Link from "@/components/Partials/Link";
import Spinner from "@/components/Partials/Spinner";
import api from "@/services/api";
import T from "@/translations";

const EmailChangeConfirmRoute: Component = () => {
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
					<img src={LogoIcon} alt="Lucid CMS Logo" class="h-10 mx-auto mb-6" />
					<h1 class="mb-1">
						{T()("routes.auth.email.change.confirmed.title")}
					</h1>
					<p>{T()("routes.auth.email.change.confirmed.description")}</p>
					<Link
						theme="primary"
						size="medium"
						href="/lucid/login"
						classes="mt-8"
					>
						{T()("common.back.to.login")}
					</Link>
				</div>
			</Match>
			<Match when={checkToken.isSuccess}>
				<div class="text-center max-w-sm mx-auto">
					<img src={LogoIcon} alt="Lucid CMS Logo" class="h-10 mx-auto mb-6" />
					<h1 class="mb-1">{T()("routes.auth.email.change.confirm.title")}</h1>
					<p>{T()("routes.auth.email.change.confirm.description")}</p>
					<div class="mt-8 flex justify-center">
						<Button
							theme="primary"
							size="medium"
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

export default EmailChangeConfirmRoute;

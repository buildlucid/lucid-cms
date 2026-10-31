import {
	browserSupportsWebAuthnAutofill,
	WebAuthnAbortService,
	WebAuthnError,
} from "@simplewebauthn/browser";
import {
	type Accessor,
	batch,
	createEffect,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import api from "@/services/api";
import { LucidError } from "@/utils/error-handling";

/** Retries only cancellations and expired or unknown credentials, avoiding persistent error loops. */
const canRestart = (error: unknown, signal: AbortSignal) => {
	if (signal.aborted) return true;
	if (error instanceof WebAuthnError) {
		return error.code === "ERROR_CEREMONY_ABORTED";
	}
	if (error instanceof LucidError) {
		return (
			error.errorRes.code === "passkey_expired" ||
			error.errorRes.code === "passkey_unknown"
		);
	}
	return false;
};

/**
 * Enable after a field with `autocomplete="username webauthn"` is mounted. Pause while another
 * passkey prompt is open.
 */
export const usePasskeyAutofill = (props: {
	enabled: Accessor<boolean>;
	paused: Accessor<boolean>;
}) => {
	// ----------------------------------------
	// State & Hooks
	const login = api.auth.usePasskeyLogin();
	const [supported, setSupported] = createSignal(false);
	const [running, setRunning] = createSignal(false);
	const [stopped, setStopped] = createSignal(false);
	let attempt: AbortController | undefined;
	let disposed = false;

	// ----------------------------------------
	// Functions
	const start = () => {
		const controller = new AbortController();
		attempt = controller;
		setRunning(true);
		login.action
			.mutateAsync({ autofill: true, signal: controller.signal })
			.catch((error: unknown) => {
				if (disposed || attempt !== controller) return;
				//* Batch updates to prevent the effect restarting before stopped is set.
				batch(() => {
					setRunning(false);
					if (!canRestart(error, controller.signal)) setStopped(true);
				});
			});
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		void browserSupportsWebAuthnAutofill().then((value) => {
			if (!disposed) setSupported(value);
		});
	});

	//* Abort pending autofill before another prompt opens.
	createEffect(() => {
		if (props.paused()) attempt?.abort();
	});

	createEffect(() => {
		if (!props.enabled() || !supported() || props.paused()) return;
		if (running() || stopped()) return;
		start();
	});

	onCleanup(() => {
		disposed = true;
		attempt?.abort();
		if (running()) WebAuthnAbortService.cancelCeremony();
	});
};

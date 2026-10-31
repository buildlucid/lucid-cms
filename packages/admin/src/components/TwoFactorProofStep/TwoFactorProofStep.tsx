import type { ErrorResponse, TwoFactorProof } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
} from "solid-js";
import Button, { type ButtonVariant } from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import TwoFactorProofField, {
	isTwoFactorProofComplete,
	type TwoFactorProofMethod,
	toTwoFactorProof,
} from "@/components/TwoFactorProofField/TwoFactorProofField";
import T from "@/translations";

interface TwoFactorProofStepProps {
	title: string;
	description: string;
	submitLabel: string;
	/** @default "primary" */
	submitVariant?: ButtonVariant;
	isLoading: boolean;
	/** The request's errors. The input clears when a code is turned down. */
	errors: Accessor<ErrorResponse | undefined>;
	onSubmit: (_proof: TwoFactorProof) => void;
	onCancel: () => void;
}

/** A modal step that asks for an authenticator or recovery code before a two-factor change. */
const TwoFactorProofStep: Component<TwoFactorProofStepProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [method, setMethod] = createSignal<TwoFactorProofMethod>("code");
	const [value, setValue] = createSignal("");

	// ----------------------------------------
	// Memos
	const complete = createMemo(() =>
		isTwoFactorProofComplete(method(), value()),
	);

	// ----------------------------------------
	// Functions
	const submit = (code: string) => {
		if (!isTwoFactorProofComplete(method(), code) || props.isLoading) return;
		props.onSubmit(toTwoFactorProof(method(), code));
	};

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.errors(),
			(errors) => {
				if (errors) setValue("");
			},
		),
	);

	// ----------------------------------------
	// Render
	return (
		<form
			class="w-full"
			onSubmit={(event) => {
				event.preventDefault();
				submit(value());
			}}
		>
			<Modal.Header>
				<Modal.Title>{props.title}</Modal.Title>
				<Modal.Description>{props.description}</Modal.Description>
			</Modal.Header>
			<Modal.Body>
				<TwoFactorProofField
					theme="basic"
					method={method()}
					onMethodChange={setMethod}
					value={value()}
					onChange={(next) => {
						setValue(next);
						if (method() === "code") submit(next);
					}}
					errors={props.errors}
					disabled={props.isLoading}
				/>
			</Modal.Body>
			<Modal.Footer>
				<Modal.Actions>
					<Button
						type="button"
						variant="outline"
						size="md"
						disabled={props.isLoading}
						onClick={() => props.onCancel()}
					>
						{T()("common.cancel")}
					</Button>
					<Button
						type="submit"
						variant={props.submitVariant ?? "primary"}
						size="md"
						loading={props.isLoading}
						disabled={!complete()}
					>
						{props.submitLabel}
					</Button>
				</Modal.Actions>
			</Modal.Footer>
		</form>
	);
};

export default TwoFactorProofStep;

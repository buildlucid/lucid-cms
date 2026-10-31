import type { ErrorResponse, TwoFactorProof } from "@types";
import classNames from "classnames";
import { type Accessor, type Component, Show } from "solid-js";
import Input from "@/components/Input/Input";
import { InsetLabelInput } from "@/components/InsetLabelInput/InsetLabelInput";
import constants from "@/constants";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

export type TwoFactorProofMethod = "code" | "recoveryCode";

export const toTwoFactorProof = (
	method: TwoFactorProofMethod,
	value: string,
): TwoFactorProof =>
	method === "code"
		? { code: value.replace(/\D/g, "") }
		: { recoveryCode: value.trim() };

export const isTwoFactorProofComplete = (
	method: TwoFactorProofMethod,
	value: string,
) =>
	method === "code"
		? value.replace(/\D/g, "").length === constants.twoFactor.codeLength
		: value.replace(/[^a-z0-9]/gi, "").length >=
			constants.twoFactor.recoveryCodeLength;

interface TwoFactorProofFieldProps {
	method: TwoFactorProofMethod;
	onMethodChange: (_method: TwoFactorProofMethod) => void;
	value: string;
	onChange: (_value: string) => void;
	errors?: Accessor<ErrorResponse | undefined>;
	/** `inset` matches the other inputs on login pages, and `basic` the ones in modals. */
	theme: "inset" | "basic";
	/**
	 * Focuses the input when it shows, and again after switching between app and recovery codes. Only
	 * for `inset`.
	 */
	autofocus?: boolean;
	/** Stops switching between app and recovery codes while one is being checked. */
	disabled?: boolean;
}

const TwoFactorProofField: Component<TwoFactorProofFieldProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<>
			{/* keyed, so the input is fresh after switching */}
			<Show when={props.method} keyed>
				{(method) =>
					props.theme === "inset" ? (
						<InsetLabelInput
							id={method}
							name={method}
							type="text"
							value={props.value}
							onChange={props.onChange}
							copy={{
								label:
									method === "code"
										? T()("auth.two.factor.code.label")
										: T()("auth.two.factor.recovery.code.label"),
							}}
							inputMode={method === "code" ? "numeric" : "text"}
							autoComplete={method === "code" ? "one-time-code" : "off"}
							autofocus={props.autofocus}
							required={true}
							errors={getBodyError(method, props.errors)}
						/>
					) : (
						<Input
							id={method}
							name={method}
							type="text"
							label={
								method === "code"
									? T()("auth.two.factor.code.label")
									: T()("auth.two.factor.recovery.code.label")
							}
							value={props.value}
							onChange={props.onChange}
							inputmode={method === "code" ? "numeric" : "text"}
							autocomplete={method === "code" ? "one-time-code" : "off"}
							required={true}
							errors={getBodyError(method, props.errors)}
						/>
					)
				}
			</Show>
			<button
				type="button"
				class={classNames(
					"self-start text-left text-sm hover:text-primary-hover duration-200 transition-colors disabled:cursor-not-allowed disabled:opacity-80",
					{
						"mt-1": props.theme === "inset",
						"mt-2.5": props.theme === "basic",
					},
				)}
				disabled={props.disabled}
				onClick={() => {
					props.onChange("");
					props.onMethodChange(
						props.method === "code" ? "recoveryCode" : "code",
					);
				}}
			>
				{props.method === "code"
					? T()("auth.two.factor.use.recovery.code")
					: T()("auth.two.factor.use.app")}
			</button>
		</>
	);
};

export default TwoFactorProofField;

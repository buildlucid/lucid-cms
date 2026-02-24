import type { ErrorResult, FieldError, UserRef, UserResponse } from "@types";
import classNames from "classnames";
import { FaSolidPen, FaSolidXmark } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	Match,
	Switch,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

interface UserSelectProps {
	id: string;
	value: number | undefined;
	ref: Accessor<UserRef | undefined>;
	onChange: (_value: number | null, _ref: UserRef) => void;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	disabled?: boolean;
	noMargin?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
	hideOptionalText?: boolean;
}

export const UserSelect: Component<UserSelectProps> = (props) => {
	// -------------------------------
	// Functions
	const userResponseToRef = (user: UserResponse): NonNullable<UserRef> => ({
		id: user.id,
		username: user.username,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
	});
	const openUserSelectModal = () => {
		pageBuilderModalsStore.open("userSelect", {
			data: {
				selected: props.value,
			},
			onCallback: (user: UserResponse) => {
				props.onChange(user.id, userResponseToRef(user));
			},
		});
	};

	// -------------------------------
	// Memos
	const userName = createMemo(() => {
		const user = props.ref();
		if (!user) return "";
		return helpers.formatUserName(user, "username");
	});

	// -------------------------------
	// Render
	return (
		<div
			class={classNames("w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<Label
				id={props.id}
				label={props.copy?.label}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
				hideOptionalText={props.hideOptionalText}
			/>
			<div class="w-full">
				<Switch>
					<Match when={typeof props.value !== "number"}>
						<Button
							type="button"
							theme="border-outline"
							size="small"
							onClick={openUserSelectModal}
							disabled={props.disabled}
							classes="capitalize"
						>
							{T()("select_user")}
						</Button>
					</Match>
					<Match when={typeof props.value === "number"}>
						<div class="group w-full border border-border rounded-md bg-input-base px-3 py-2">
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0 flex-1">
									<span class="text-sm font-medium text-subtitle truncate block">
										{userName() || "-"}
									</span>
									<p class="mt-1 text-xs text-unfocused truncate">
										{props.ref()?.email || "-"}
									</p>
								</div>
								<div class="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
									<Button
										type="button"
										theme="secondary-subtle"
										size="icon-subtle"
										onClick={openUserSelectModal}
										disabled={props.disabled}
									>
										<FaSolidPen size={12} />
										<span class="sr-only">{T()("edit")}</span>
									</Button>
									<Button
										type="button"
										theme="danger-subtle"
										size="icon-subtle"
										onClick={() => {
											props.onChange(null, null);
										}}
										disabled={props.disabled}
									>
										<FaSolidXmark size={14} />
										<span class="sr-only">{T()("clear")}</span>
									</Button>
								</div>
							</div>
						</div>
					</Match>
				</Switch>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};

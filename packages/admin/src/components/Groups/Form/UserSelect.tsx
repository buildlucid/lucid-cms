import type { ErrorResult, FieldError } from "@types";
import classNames from "classnames";
import { FaSolidPen, FaSolidXmark } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import type { UserRelationRef } from "@/utils/relation-field-helpers";

interface UserSelectProps {
	id: string;
	value: number[] | undefined;
	refs: Accessor<UserRelationRef[] | undefined>;
	onChange: (_value: number[], _refs: UserRelationRef[]) => void;
	multiple?: boolean;
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
	const openUserSelectModal = () => {
		pageBuilderModalsStore.open("userSelect", {
			data: {
				multiple: isMultiple(),
				selected: props.value,
				selectedRefs: selectedUsers(),
			},
			onCallback: (selection) => {
				props.onChange(selection.value, selection.refs);
			},
		});
	};
	const clearSelection = () => {
		props.onChange([], []);
	};
	const removeSelectedUser = (userId: number) => {
		props.onChange(
			(props.value || []).filter((selectedId) => selectedId !== userId),
			selectedUsers().filter((user) => user.id !== userId),
		);
	};

	// -------------------------------
	// Memos
	const isMultiple = createMemo(() => props.multiple === true);
	const selectedUserIds = createMemo(() => props.value ?? []);
	const selectedUsers = createMemo(() => props.refs() ?? []);
	const selectedUser = createMemo(() => selectedUsers()[0]);
	const userName = createMemo(() => {
		const user = selectedUser();
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
					<Match when={isMultiple()}>
						<div class="w-full">
							<Show when={selectedUsers().length > 0}>
								<div class="flex flex-col gap-2">
									<For each={selectedUsers()}>
										{(user) => (
											<div class="group flex items-center justify-between gap-3 rounded-md border bg-input-base border-border px-3 py-2">
												<div class="min-w-0">
													<p class="truncate text-sm font-medium text-subtitle">
														{helpers.formatUserName(user, "username") || "-"}
													</p>
													<p class="truncate text-xs text-unfocused">
														{user.email || "-"}
													</p>
												</div>
												<div class="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
													<Button
														type="button"
														theme="danger-subtle"
														size="icon-subtle"
														onClick={() => removeSelectedUser(user.id)}
														disabled={props.disabled}
														aria-label={T()("remove")}
													>
														<FaSolidXmark size={14} />
													</Button>
												</div>
											</div>
										)}
									</For>
								</div>
							</Show>
							<div
								class={classNames(
									"flex flex-wrap items-center justify-between gap-3",
									{
										"mt-3": selectedUsers().length > 0,
									},
								)}
							>
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
								<Show when={selectedUsers().length > 0}>
									<p class="text-sm text-unfocused">
										{selectedUserIds().length} {T()("selected").toLowerCase()}
									</p>
								</Show>
							</div>
						</div>
					</Match>
					<Match when={!isMultiple() && selectedUser()}>
						<div class="group w-full border border-border rounded-md bg-input-base px-3 py-2">
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0 flex-1">
									<span class="text-sm font-medium text-subtitle truncate block">
										{userName() || "-"}
									</span>
									<p class="text-xs text-unfocused truncate">
										{selectedUser()?.email || "-"}
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
										onClick={clearSelection}
										disabled={props.disabled}
									>
										<FaSolidXmark size={14} />
										<span class="sr-only">{T()("clear")}</span>
									</Button>
								</div>
							</div>
						</div>
					</Match>
					<Match when={selectedUserIds().length === 0}>
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
				</Switch>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};

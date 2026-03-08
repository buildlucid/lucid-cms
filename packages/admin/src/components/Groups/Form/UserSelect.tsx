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
import DragDrop, { type DragDropCBT } from "@/components/Partials/DragDrop";
import RelationCount from "@/components/Partials/RelationCount";
import brickStore from "@/store/brickStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import T from "@/translations";
import { moveArrayItem } from "@/utils/array-helpers";
import { normalizeFieldErrors } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import type { UserRelationRef } from "@/utils/relation-field-helpers";

interface UserSelectProps {
	id: string;
	value: number[] | undefined;
	refs: Accessor<UserRelationRef[] | undefined>;
	onChange: (_value: number[], _refs: UserRelationRef[]) => void;
	multiple?: boolean;
	minItems?: number;
	maxItems?: number;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	disabled?: boolean;
	noMargin?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldError | FieldError[];
	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
	hideOptionalText?: boolean;
}

const USER_SELECT_DRAG_DROP_KEY = "user-select-zone";

export const UserSelect: Component<UserSelectProps> = (props) => {
	// -------------------------------
	// Functions
	const canOpenSelectModal = () =>
		props.disabled !== true &&
		(props.multiple !== true ||
			typeof props.maxItems !== "number" ||
			(props.refs()?.length ?? 0) < props.maxItems);

	const openUserSelectModal = () => {
		if (!canOpenSelectModal()) return;

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
	const reorderSelectedUsers = (ref: string, targetRef: string) => {
		if (props.disabled) return;

		const users = selectedUsers();
		const fromIndex = users.findIndex((user) => `${user.id}` === ref);
		const toIndex = users.findIndex((user) => `${user.id}` === targetRef);
		const nextUsers = moveArrayItem(users, fromIndex, toIndex);

		if (nextUsers === users) return;

		props.onChange(
			nextUsers.map((user) => user.id),
			nextUsers,
		);
	};

	// -------------------------------
	// Memos
	const isMultiple = createMemo(() => props.multiple === true);
	const selectedUserIds = createMemo(() => props.value ?? []);
	const selectedUsers = createMemo(() => props.refs() ?? []);
	const selectedUsersById = createMemo(() => {
		return new Map(selectedUsers().map((user) => [user.id, user]));
	});
	const selectedUser = createMemo(() => selectedUsers()[0]);
	const hasMaxItems = createMemo(() => typeof props.maxItems === "number");
	const hasReachedMaxItems = createMemo(
		() => hasMaxItems() && selectedUsers().length >= (props.maxItems || 0),
	);
	const canAddMore = createMemo(() => !hasReachedMaxItems());
	const fieldErrors = createMemo(() => normalizeFieldErrors(props.errors));
	const getItemErrors = (itemIndex: number) =>
		fieldErrors().filter((error) => error.itemIndex === itemIndex);
	const hasItemError = (itemIndex: number) =>
		getItemErrors(itemIndex).length > 0;
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
								<DragDrop
									animationMode="web-animation"
									sortOrder={(ref, targetRef) => {
										reorderSelectedUsers(ref, targetRef);
									}}
								>
									{({ dragDrop }) => (
										<div class="flex flex-col gap-2">
											<For each={selectedUserIds()}>
												{(userId, index) => (
													<Show when={selectedUsersById().get(userId)}>
														{(user) => (
															<UserSortableItem
																user={user()}
																hasError={hasItemError(index())}
																removeSelectedUser={removeSelectedUser}
																disabled={props.disabled}
																dragDrop={dragDrop}
															/>
														)}
													</Show>
												)}
											</For>
										</div>
									)}
								</DragDrop>
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
									disabled={props.disabled || !canAddMore()}
									classes="capitalize"
								>
									{T()("select_user")}
								</Button>
								<Show when={selectedUsers().length > 0}>
									<p class="text-sm text-unfocused">
										<RelationCount
											count={selectedUserIds().length}
											min={props.minItems}
											max={props.maxItems}
										/>
										{typeof props.minItems !== "number" &&
										typeof props.maxItems !== "number"
											? ` ${T()("selected").toLowerCase()}`
											: ""}
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
							disabled={props.disabled || !canAddMore()}
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

const UserSortableItem: Component<{
	user: UserRelationRef;
	hasError: boolean;
	removeSelectedUser: (userId: number) => void;
	dragDrop: DragDropCBT;
	disabled?: boolean;
}> = (props) => {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: native draggable container
		<div
			data-dragkey={USER_SELECT_DRAG_DROP_KEY}
			data-dragref={`${props.user.id}`}
			style={{
				"view-transition-name": `user-select-item-${props.user.id}`,
			}}
			class={classNames(
				"group flex items-center justify-between gap-3 rounded-md border bg-input-base px-3 py-2 ring-inset ring-primary-base transition-colors duration-200 transform-gpu",
				{
					"border-border": !props.hasError,
					"border-error-base ring-1 ring-inset ring-error-base": props.hasError,
					"opacity-60":
						props.dragDrop.getDragging()?.ref === `${props.user.id}`,
					"ring-1 ring-primary-base":
						props.dragDrop.getDraggingTarget()?.ref === `${props.user.id}` &&
						props.dragDrop.getDragging()?.ref !== `${props.user.id}` &&
						!props.hasError,
					"cursor-grab active:cursor-grabbing": props.disabled !== true,
				},
			)}
			draggable={props.disabled !== true}
			onDragStart={(e) => {
				brickStore.get.startRelationFieldDrag();
				props.dragDrop.onDragStart(e, {
					ref: `${props.user.id}`,
					key: USER_SELECT_DRAG_DROP_KEY,
				});
			}}
			onDragEnd={(e) => {
				props.dragDrop.onDragEnd(e);
				brickStore.get.endRelationFieldDrag();
			}}
			onDragEnter={(e) =>
				props.dragDrop.onDragEnter(e, {
					ref: `${props.user.id}`,
					key: USER_SELECT_DRAG_DROP_KEY,
				})
			}
			onDragOver={(e) => props.dragDrop.onDragOver(e)}
		>
			<div class="min-w-0">
				<p class="truncate text-sm font-medium text-subtitle">
					{helpers.formatUserName(props.user, "username") || "-"}
				</p>
				<p class="truncate text-xs text-unfocused">{props.user.email || "-"}</p>
			</div>
			<div class="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
				<Button
					type="button"
					theme="danger-subtle"
					size="icon-subtle"
					onClick={() => props.removeSelectedUser(props.user.id)}
					disabled={props.disabled}
					aria-label={T()("remove")}
				>
					<FaSolidXmark size={14} />
				</Button>
			</div>
		</div>
	);
};

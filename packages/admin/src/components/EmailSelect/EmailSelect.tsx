import type { EmailRef, ErrorResult, FieldError } from "@types";
import classNames from "classnames";
import { TbOutlineMail, TbOutlineX } from "solid-icons/tb";
import {
	type Accessor,
	type Component,
	createMemo,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import Button from "@/components/Button/Button";
import DragDrop, { type DragDropCBT } from "@/components/DragDrop/DragDrop";
import { EmailPreviewCard } from "@/components/EmailSelect/parts/EmailPreviewCard";
import { FieldFeedback } from "@/components/FieldFeedback/FieldFeedback";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import Pill from "@/components/Pill/Pill";
import RelationCount from "@/components/RelationCount/RelationCount";
import { userAvatarClasses } from "@/components/UserDisplay/UserDisplay";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore/pageBuilderModalsStore";
import T from "@/translations";
import { moveArrayItem } from "@/utils/array-helpers";
import { emailStatusPills } from "@/utils/emails";
import { normalizeFieldErrors } from "@/utils/error-helpers";

interface EmailSelectProps {
	id: string;
	value: number[] | undefined;
	refs: Accessor<EmailRef[] | undefined>;
	onChange: (_value: number[], _refs: EmailRef[]) => void;
	multiple?: boolean;
	allowInternal?: boolean;
	minItems?: number;
	maxItems?: number;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	disabled?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldError | FieldError[];
	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
}

const EMAIL_SELECT_DRAG_DROP_KEY = "email-select-zone";

export const EmailSelect: Component<EmailSelectProps> = (props) => {
	// -------------------------------
	// Functions
	const canOpenSelectModal = () =>
		props.disabled !== true &&
		(props.multiple !== true ||
			typeof props.maxItems !== "number" ||
			(props.refs()?.length ?? 0) < props.maxItems);

	const openEmailSelectModal = () => {
		if (!canOpenSelectModal()) return;

		pageBuilderModalsStore.open("emailSelect", {
			data: {
				multiple: isMultiple(),
				maxItems: props.maxItems,
				allowInternal: props.allowInternal,
				selected: props.value,
				selectedRefs: selectedEmails(),
			},
			onCallback: (selection) => {
				props.onChange(selection.value, selection.refs);
			},
		});
	};
	const clearSelection = () => {
		props.onChange([], []);
	};
	const removeSelectedEmail = (emailId: number) => {
		props.onChange(
			(props.value || []).filter((selectedId) => selectedId !== emailId),
			selectedEmails().filter((email) => email.id !== emailId),
		);
	};
	const reorderSelectedEmails = (ref: string, targetRef: string) => {
		if (props.disabled) return;

		const emails = selectedEmails();
		const fromIndex = emails.findIndex((email) => `${email.id}` === ref);
		const toIndex = emails.findIndex((email) => `${email.id}` === targetRef);
		const nextEmails = moveArrayItem(emails, fromIndex, toIndex);

		if (nextEmails === emails) return;

		props.onChange(
			nextEmails.map((email) => email.id),
			nextEmails,
		);
	};

	// -------------------------------
	// Memos
	const isMultiple = createMemo(() => props.multiple === true);
	const selectedEmailIds = createMemo(() => props.value ?? []);
	const selectedEmails = createMemo(() => props.refs() ?? []);
	const selectedEmailsById = createMemo(() => {
		return new Map(selectedEmails().map((email) => [email.id, email]));
	});
	const selectedEmail = createMemo(() => selectedEmails()[0]);
	const hasReachedMaxItems = createMemo(
		() =>
			typeof props.maxItems === "number" &&
			selectedEmails().length >= props.maxItems,
	);
	const fieldErrors = createMemo(() => normalizeFieldErrors(props.errors));
	const hasItemError = (itemIndex: number) =>
		fieldErrors().some((error) => error.itemIndex === itemIndex);

	// -------------------------------
	// Render
	return (
		<div class={"w-full"}>
			<FormLabel
				id={props.id}
				label={props.copy?.label}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
			/>
			<div class="w-full">
				<Switch>
					<Match when={isMultiple()}>
						<div class="w-full">
							<Show when={selectedEmails().length > 0}>
								<DragDrop
									animationMode="web-animation"
									sortOrder={(ref, targetRef) => {
										reorderSelectedEmails(ref, targetRef);
									}}
								>
									{({ dragDrop }) => (
										<div class="flex flex-col gap-2">
											<For each={selectedEmailIds()}>
												{(emailId, index) => (
													<Show when={selectedEmailsById().get(emailId)}>
														{(email) => (
															<EmailSortableItem
																email={email()}
																hasError={hasItemError(index())}
																removeSelectedEmail={removeSelectedEmail}
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
										"mt-3": selectedEmails().length > 0,
									},
								)}
							>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={openEmailSelectModal}
									disabled={props.disabled || hasReachedMaxItems()}
									class="capitalize"
								>
									{T()("emails.select.action")}
								</Button>
								<Show when={selectedEmails().length > 0}>
									<p class="text-sm text-muted">
										<RelationCount
											count={selectedEmailIds().length}
											min={props.minItems}
											max={props.maxItems}
										/>
										{typeof props.minItems !== "number" &&
										typeof props.maxItems !== "number"
											? ` ${T()("common.selected").toLowerCase()}`
											: ""}
									</p>
								</Show>
							</div>
						</div>
					</Match>
					<Match when={!isMultiple() && selectedEmail()}>
						{(email) => (
							<EmailPreviewCard
								email={email()}
								disabled={props.disabled}
								onChange={openEmailSelectModal}
								onClear={clearSelection}
							/>
						)}
					</Match>
					<Match when={selectedEmailIds().length === 0}>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={openEmailSelectModal}
							disabled={props.disabled}
							class="capitalize"
						>
							{T()("emails.select.action")}
						</Button>
					</Match>
				</Switch>
			</div>
			<FieldFeedback
				id={props.id}
				describedBy={props.copy?.describedBy}
				errors={props.errors}
			/>
		</div>
	);
};

const EmailSortableItem: Component<{
	email: EmailRef;
	hasError: boolean;
	removeSelectedEmail: (emailId: number) => void;
	dragDrop: DragDropCBT;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const brickStore = useBrickStore();

	// ----------------------------------------
	// Render
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: native draggable container
		<div
			data-dragkey={EMAIL_SELECT_DRAG_DROP_KEY}
			data-dragref={`${props.email.id}`}
			style={{
				"view-transition-name": `email-select-item-${props.email.id}`,
			}}
			class={classNames(
				"group flex items-center justify-between gap-3 rounded-md border bg-input px-3 py-2 transition-colors duration-200 transform-gpu",
				{
					"border-border": !props.hasError,
					"border-danger ring-1 ring-inset ring-danger": props.hasError,
					"opacity-60":
						props.dragDrop.getDragging()?.ref === `${props.email.id}`,
					"ring-1 ring-inset ring-primary":
						props.dragDrop.getDraggingTarget()?.ref === `${props.email.id}` &&
						props.dragDrop.getDragging()?.ref !== `${props.email.id}` &&
						!props.hasError,
					"cursor-grab active:cursor-grabbing": props.disabled !== true,
				},
			)}
			draggable={props.disabled !== true}
			onDragStart={(e) => {
				brickStore.get.startRelationFieldDrag();
				props.dragDrop.onDragStart(e, {
					ref: `${props.email.id}`,
					key: EMAIL_SELECT_DRAG_DROP_KEY,
				});
			}}
			onDragEnd={(e) => {
				props.dragDrop.onDragEnd(e);
				brickStore.get.endRelationFieldDrag();
			}}
			onDragEnter={(e) =>
				props.dragDrop.onDragEnter(e, {
					ref: `${props.email.id}`,
					key: EMAIL_SELECT_DRAG_DROP_KEY,
				})
			}
			onDragOver={(e) => props.dragDrop.onDragOver(e)}
		>
			<div class="flex min-w-0 items-center gap-2.5">
				<span
					class={userAvatarClasses({
						variant: "icon",
						size: "md",
						bordered: true,
					})}
					aria-hidden="true"
				>
					<TbOutlineMail size={16} />
				</span>
				<div class="min-w-0">
					<p class="truncate text-sm font-medium text-subtitle">
						{props.email.subject}
					</p>
					<p class="truncate text-xs text-muted">
						{props.email.to ?? props.email.from.address}
					</p>
				</div>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<Show when={props.email.currentStatus}>
					{(status) => (
						<Pill variant={emailStatusPills[status()]} size="xs">
							{status()}
						</Pill>
					)}
				</Show>
				<div class="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
					<Button
						type="button"
						variant="danger-ghost"
						size="xs"
						shape="square"
						onClick={() => props.removeSelectedEmail(props.email.id)}
						disabled={props.disabled}
						aria-label={T()("common.remove")}
					>
						<TbOutlineX size={14} />
					</Button>
				</div>
			</div>
		</div>
	);
};

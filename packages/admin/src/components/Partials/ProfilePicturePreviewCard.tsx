import type { ProfilePicture } from "@types";
import classNames from "classnames";
import { FaSolidPen, FaSolidPlus, FaSolidXmark } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	Show,
} from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import ClickToCopy from "@/components/Partials/ClickToCopy";
import MediaPreview from "@/components/Partials/MediaPreview";
import Pill from "@/components/Partials/Pill";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

interface ProfilePicturePreviewCardProps {
	user: {
		username?: string | null;
		firstName?: string | null;
		lastName?: string | null;
		profilePicture?: ProfilePicture | null;
	};
	onEdit?: () => void;
	onClear?: () => void;
	clearLoading?: boolean;
	classes?: string;
	previewHeight?: "medium" | "large";
}

const ProfilePicturePreviewCard: Component<ProfilePicturePreviewCardProps> = (
	props,
) => {
	// ----------------------------------------
	// State
	const [clearConfirmationOpen, setClearConfirmationOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const media = createMemo(() => props.user.profilePicture);
	const initials = createMemo(() => {
		if (!props.user.username) return "";

		return helpers.formatUserInitials({
			username: props.user.username,
			firstName: props.user.firstName,
			lastName: props.user.lastName,
		});
	});
	const editLabel = createMemo(() =>
		media() ? T()("update_profile_picture") : T()("set_profile_picture"),
	);
	const mediaDimensions = createMemo(() => {
		const profilePicture = media();
		if (!profilePicture?.meta.width || !profilePicture.meta.height) return null;

		return `${profilePicture.meta.width} x ${profilePicture.meta.height}`;
	});
	const hasMediaMeta = createMemo(() => {
		const profilePicture = media();
		if (!profilePicture) return false;

		return (
			Boolean(profilePicture.meta.fileSize) ||
			Boolean(mediaDimensions()) ||
			Boolean(profilePicture.meta.mimeType) ||
			Boolean(profilePicture.meta.extension)
		);
	});
	const title = createMemo(() => {
		const profilePicture = media();
		if (!profilePicture) return props.user.username ?? T()("profile_picture");

		return (
			helpers.getTranslation(
				profilePicture.title,
				contentLocaleStore.get.contentLocale,
			) ||
			helpers.getTranslation(
				profilePicture.alt,
				contentLocaleStore.get.contentLocale,
			) ||
			helpers.formatFileNameTitle(profilePicture.fileName) ||
			profilePicture.key
		);
	});
	const alt = createMemo(() => {
		const profilePicture = media();
		if (!profilePicture) return "";

		return (
			helpers.getTranslation(
				profilePicture.alt,
				contentLocaleStore.get.contentLocale,
			) ||
			title() ||
			""
		);
	});

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.clearLoading === true,
			(isClearing, wasClearing) => {
				if (!isClearing && wasClearing) {
					setClearConfirmationOpen(false);
				}
			},
			{ defer: true },
		),
	);

	// ----------------------------------------
	// Handlers
	const handleClearConfirm = () => {
		props.onClear?.();
	};
	const handleClearCancel = () => {
		setClearConfirmationOpen(false);
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<div
				class={classNames(
					"group w-full overflow-hidden rounded-md border border-border bg-input-base",
					props.classes,
				)}
			>
				<button
					type="button"
					class={classNames(
						"rectangle-background relative flex w-full items-center justify-center border-b border-border p-4 focus:outline-hidden focus-visible:ring-1 ring-inset ring-primary-base",
						{
							"h-52": props.previewHeight !== "large",
							"h-72": props.previewHeight === "large",
							"cursor-default": !props.onEdit,
						},
					)}
					onClick={() => props.onEdit?.()}
					disabled={!props.onEdit}
				>
					<Show when={media()}>
						{(profilePicture) => (
							<Show when={hasMediaMeta()}>
								<div class="pointer-events-none absolute top-0 right-0 left-0 z-20 flex flex-wrap items-center gap-2 bg-linear-to-b from-card-base via-card-base/80 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
									<div class="flex flex-wrap items-center gap-2">
										<Show when={profilePicture().meta.fileSize}>
											<Pill theme="outline">
												{helpers.bytesToSize(profilePicture().meta.fileSize)}
											</Pill>
										</Show>
										<Show when={mediaDimensions()}>
											<Pill theme="outline">{mediaDimensions()}</Pill>
										</Show>
										<Show when={profilePicture().meta.mimeType}>
											<Pill theme="outline">
												{profilePicture().meta.mimeType}
											</Pill>
										</Show>
										<Show when={profilePicture().meta.extension}>
											<Pill theme="outline">
												{profilePicture().meta.extension.toUpperCase()}
											</Pill>
										</Show>
									</div>
								</div>
							</Show>
						)}
					</Show>
					<Show
						when={media()}
						fallback={
							<div
								class={classNames(
									"z-10 flex h-full aspect-square max-w-full items-center justify-center rounded-md border border-border bg-input-base font-bold text-unfocused",
									{
										"text-5xl": props.previewHeight === "large",
										"text-4xl": props.previewHeight !== "large",
									},
								)}
							>
								<Show
									when={initials()}
									fallback={
										<span class="px-3 text-center text-sm font-medium text-unfocused">
											{T()("no_profile_picture")}
										</span>
									}
								>
									{initials()}
								</Show>
							</div>
						}
					>
						{(profilePicture) => (
							<div class="flex h-full w-full items-center justify-center [&_img]:max-h-full [&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full">
								<MediaPreview
									media={{
										url: profilePicture().url,
										type: profilePicture().type,
									}}
									alt={alt()}
									richPreview={true}
									imageFit="contain"
								/>
							</div>
						)}
					</Show>
				</button>
				<div class="flex items-center justify-between gap-3 p-3">
					<div class="min-w-0">
						<p class="line-clamp-1 text-sm font-medium text-subtitle">
							{title()}
						</p>
						<Show
							when={media()}
							fallback={
								<p class="mt-1 text-xs text-unfocused">
									{T()("no_profile_picture")}
								</p>
							}
						>
							{(profilePicture) => (
								<div class="mt-1">
									<ClickToCopy
										type="simple"
										text={profilePicture().key}
										value={profilePicture().url}
										class="text-xs text-unfocused max-w-full"
									/>
								</div>
							)}
						</Show>
					</div>
					<div class="flex shrink-0 items-center gap-1">
						<Show when={props.onEdit}>
							<Button
								type="button"
								theme="secondary-subtle"
								size="icon-subtle"
								onClick={() => props.onEdit?.()}
								aria-label={editLabel()}
							>
								<Show when={media()} fallback={<FaSolidPlus size={12} />}>
									<FaSolidPen size={12} />
								</Show>
							</Button>
						</Show>
						<Show when={props.onClear && media()}>
							<Button
								type="button"
								theme="danger-subtle"
								size="icon-subtle"
								onClick={() => setClearConfirmationOpen(true)}
								loading={props.clearLoading}
								aria-label={T()("clear")}
							>
								<FaSolidXmark size={14} />
							</Button>
						</Show>
					</div>
				</div>
			</div>
			<Confirmation
				theme="danger"
				state={{
					open: clearConfirmationOpen(),
					setOpen: setClearConfirmationOpen,
					isLoading: props.clearLoading,
				}}
				copy={{
					title: T()("profile_picture_clear_confirm_title"),
					description: T()("profile_picture_clear_confirm_description"),
				}}
				callbacks={{
					onConfirm: handleClearConfirm,
					onCancel: handleClearCancel,
				}}
			/>
		</>
	);
};

export default ProfilePicturePreviewCard;

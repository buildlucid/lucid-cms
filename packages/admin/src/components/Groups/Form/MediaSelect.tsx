import type { ErrorResult, FieldError, MediaRef, MediaResponse } from "@types";
import classNames from "classnames";
import { FaSolidPen, FaSolidXmark } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	Match,
	Show,
	Switch,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import ClickToCopy from "@/components/Partials/ClickToCopy";
import MediaPreview from "@/components/Partials/MediaPreview";
import Pill from "@/components/Partials/Pill";
import contentLocaleStore from "@/store/contentLocaleStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

interface MediaSelectProps {
	id: string;
	value: number | undefined;
	ref: Accessor<MediaRef | undefined>;
	onChange: (_value: number | null, _ref: MediaRef | null) => void;
	extensions?: string[];
	type?: string;
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

export const MediaSelect: Component<MediaSelectProps> = (props) => {
	// -------------------------------
	// Functions
	const parseExtensions = (extensions?: string[]) => {
		if (!extensions) return undefined;
		return extensions
			.map((extension) => {
				return extension.replace(".", "");
			})
			.join(",");
	};
	const mediaResponseToRef = (media: MediaResponse) => ({
		id: media.id,
		url: media.url,
		key: media.key,
		mimeType: media.meta.mimeType,
		extension: media.meta.extension,
		fileSize: media.meta.fileSize,
		type: media.type,
		width: media.meta.width ?? null,
		height: media.meta.height ?? null,
		blurHash: media.meta.blurHash ?? null,
		averageColor: media.meta.averageColor ?? null,
		isDark: media.meta.isDark ?? null,
		isLight: media.meta.isLight ?? null,
		title: media.title.reduce<Record<string, string>>((acc, t) => {
			if (!t.localeCode) return acc;
			acc[t.localeCode] = t.value ?? "";
			return acc;
		}, {}),
		alt: media.alt.reduce<Record<string, string>>((acc, t) => {
			if (!t.localeCode) return acc;
			acc[t.localeCode] = t.value ?? "";
			return acc;
		}, {}),
		isDeleted: media.isDeleted ?? false,
		public: media.public,
	});
	const openMediaSelectModal = () => {
		pageBuilderModalsStore.open("mediaSelect", {
			data: {
				extensions: parseExtensions(props.extensions),
				type: props.type,
				selected: props.value,
			},
			onCallback: (media: MediaResponse) => {
				props.onChange(media.id, mediaResponseToRef(media));
			},
		});
	};
	const openMediaUploadPanel = () => {
		pageBuilderModalsStore.open("mediaUpload", {
			data: {
				extensions: parseExtensions(props.extensions),
				type: props.type,
			},
			onCallback: (media: MediaResponse) => {
				props.onChange(media.id, mediaResponseToRef(media));
			},
		});
	};

	// -------------------------------
	// Memos
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const mediaTitle = createMemo(() => {
		return (
			helpers.getRecordTranslation(props.ref()?.title, contentLocale()) ||
			helpers.getRecordTranslation(props.ref()?.alt, contentLocale()) ||
			props.ref()?.key ||
			""
		);
	});
	const mediaAlt = createMemo(() => {
		return (
			helpers.getRecordTranslation(props.ref()?.alt, contentLocale()) ||
			mediaTitle()
		);
	});
	const mediaDimensions = createMemo(() => {
		const width = props.ref()?.width ?? null;
		const height = props.ref()?.height ?? null;
		if (!width || !height) return null;
		return `${width}x${height}`;
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
						<div class="flex flex-wrap gap-2">
							<Button
								type="button"
								theme="border-outline"
								size="small"
								onClick={openMediaSelectModal}
								disabled={props.disabled}
								classes="capitalize"
							>
								{T()("select_media", {
									type: props.type || "media",
								})}
							</Button>
							<Button
								type="button"
								theme="basic"
								size="small"
								onClick={openMediaUploadPanel}
								disabled={props.disabled}
								classes="capitalize"
							>
								{T()("upload_media")}
							</Button>
						</div>
					</Match>
					<Match when={typeof props.value === "number"}>
						<div class="w-full  border border-border rounded-md bg-input-base overflow-hidden group">
							<div
								class={classNames("relative z-0 bg-card-base p-4", {
									"rectangle-background":
										props.ref()?.type === "image" ||
										props.ref()?.type === "video",
								})}
							>
								<div class="z-20 flex flex-wrap items-center gap-2 absolute top-0 left-0 right-0 p-3 bg-linear-to-b from-card-base via-card-base/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
									<Show
										when={
											props.ref()?.isDeleted || props.ref()?.public === false
										}
									>
										<div class="flex flex-wrap items-center gap-2">
											<Show when={props.ref()?.isDeleted}>
												<Pill theme="red" tooltip={T()("deleted_pill_tooltip")}>
													{T()("deleted")}
												</Pill>
											</Show>
											<Show when={!props.ref()?.public}>
												<Pill theme="red" tooltip={T()("private_pill_tooltip")}>
													{T()("private")}
												</Pill>
											</Show>
										</div>
									</Show>
									<div class="flex flex-wrap items-center gap-2 ">
										<Show when={props.ref()?.fileSize}>
											<Pill theme="outline">
												{helpers.bytesToSize(props.ref()?.fileSize)}
											</Pill>
										</Show>
										<Show when={mediaDimensions()}>
											<Pill theme="outline">{mediaDimensions()}</Pill>
										</Show>
										<Show when={props.ref()?.mimeType}>
											<Pill theme="outline">{props.ref()?.mimeType}</Pill>
										</Show>
										<Show when={props.ref()?.extension}>
											<Pill theme="outline">
												{props.ref()?.extension.toUpperCase()}
											</Pill>
										</Show>
									</div>
								</div>
								<div class="w-full max-w-120 h-full max-h-96 mx-auto z-10 flex items-center justify-center :flex *:items-center *:justify-center [&_img]:max-h-96 [&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full [&_video]:max-h-96 [&_video]:h-auto [&_video]:w-auto [&_video]:max-w-full">
									<MediaPreview
										media={{
											url: props.ref()?.url || "",
											type: props.ref()?.type || "image",
										}}
										alt={mediaAlt() || ""}
										richPreview={true}
										imageFit="contain"
									/>
								</div>
							</div>
							<div class="flex items-center justify-between gap-3 p-3 border-border bg-input-base border-t-0">
								<div class="flex items-start gap-2 min-w-0">
									<div class="min-w-0">
										<p class="text-sm text-subtitle font-medium line-clamp-1">
											{mediaTitle() || T()("no_translation")}
										</p>
										<div class=" border-t-0flex items-center gap-2 min-w-0">
											<ClickToCopy
												type="simple"
												text={props.ref()?.key || ""}
												value={props.ref()?.url || ""}
												class="text-xs text-unfocused max-w-full"
											/>
										</div>
									</div>
								</div>
								<div class="flex items-center gap-0.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
									<Button
										type="button"
										theme="secondary-subtle"
										size="icon-subtle"
										onClick={openMediaSelectModal}
										disabled={props.disabled}
										aria-label={T()("select_new_media", {
											type: props.type || "media",
										})}
									>
										<FaSolidPen size={12} />
									</Button>
									<Button
										type="button"
										theme="danger-subtle"
										size="icon-subtle"
										onClick={() => {
											props.onChange(null, null);
										}}
										disabled={props.disabled}
										aria-label={T()("remove_media", {
											type: props.type || "media",
										})}
									>
										<FaSolidXmark size={14} />
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

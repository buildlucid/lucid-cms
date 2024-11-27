import T from "@/translations";
import { type Component, Match, Switch, createMemo } from "solid-js";
import classNames from "classnames";
import type {
	ErrorResult,
	FieldErrors,
	MediaResponse,
	MediaResMeta,
} from "@lucidcms/core/types";
import contentLocaleStore from "@/store/contentLocaleStore";
import mediaSelectStore from "@/store/forms/mediaSelectStore";
import helpers from "@/utils/helpers";
import Button from "@/components/Partials/Button";
import Form from "@/components/Groups/Form";
import AspectRatio from "@/components/Partials/AspectRatio";
import MediaPreview from "@/components/Partials/MediaPreview";

interface MediaSelectProps {
	id: string;
	value: number | undefined;
	meta: NonNullable<MediaResMeta> | undefined;
	onChange: (
		_value: number | null,
		_meta: NonNullable<MediaResMeta> | null,
	) => void;
	extensions?: string[];
	type?: string;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	disabled?: boolean;
	noMargin?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldErrors;
	altLocaleError?: boolean;
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
	const openMediaSelectModal = () => {
		mediaSelectStore.set({
			onSelectCallback: (media: MediaResponse) => {
				props.onChange(media.id, {
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
					averageColour: media.meta.averageColour ?? null,
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
				});
			},
			open: true,
			extensions: parseExtensions(props.extensions),
			type: props.type,
			selected: props.value,
		});
	};

	// -------------------------------
	// Memos
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);

	// -------------------------------
	// Render
	return (
		<div
			class={classNames("w-full", {
				"mb-0": props.noMargin,
				"mb-2.5 last:mb-0": !props.noMargin,
			})}
		>
			<Form.Label
				id={props.id}
				label={props.copy?.label}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
			/>
			<div class="mt-2.5 w-full">
				<Switch>
					<Match when={typeof props.value !== "number"}>
						<Button
							type="button"
							theme="secondary"
							size="x-small"
							onClick={openMediaSelectModal}
							disabled={props.disabled}
							classes="capitalize"
						>
							{T()("select_media", {
								type: props.type || "media",
							})}
						</Button>
					</Match>
					<Match when={typeof props.value === "number"}>
						<div class="w-full border border-border rounded-md bg-container-4">
							<div class="p-15 flex items-center justify-center ">
								<div class="w-full max-w-xs rounded-md overflow-hidden border border-border">
									<AspectRatio ratio="16:9">
										<MediaPreview
											media={{
												url: props.meta?.url || "",
												type: props.meta?.type || "image",
											}}
											alt={helpers.getRecordTranslation(
												props.meta?.alt,
												contentLocale(),
											)}
											richPreview={true}
										/>
									</AspectRatio>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-2.5 bg-container-2 p-15">
								<Button
									type="button"
									theme="secondary"
									size="x-small"
									onClick={openMediaSelectModal}
									disabled={props.disabled}
									classes="capitalize"
								>
									{T()("select_new_media", {
										type: props.type || "media",
									})}
								</Button>
								<Button
									type="button"
									theme="secondary"
									size="x-small"
									onClick={() => {
										props.onChange(null, null);
									}}
									disabled={props.disabled}
									classes="capitalize"
								>
									{T()("remove_media", {
										type: props.type || "media",
									})}
								</Button>
							</div>
						</div>
					</Match>
				</Switch>
			</div>
			<Form.DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<Form.ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};

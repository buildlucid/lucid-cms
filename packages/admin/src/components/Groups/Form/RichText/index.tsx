import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	type JSXElement,
	Show,
} from "solid-js";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import T from "@/translations";
import { DescribedBy } from "../DescribedBy";
import { ErrorMessage } from "../ErrorMessage";
import { Label } from "../Label";
import { richTextHasContent } from "./helpers";
import Toolbar from "./Toolbar";
import type { RichTextOptions } from "./types";
import useEditor from "./useEditor";

export type { RichTextOptions } from "./types";

interface RichTextProps {
	id: string;
	value: RichTextJSON | null | undefined;
	onChange: (_value: RichTextJSON) => void;
	copy?: {
		label?: string;
		placeholder?: string;
		describedBy?: string;
	};
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult | FieldError | FieldError[];
	localised?: boolean;
	altLocaleError?: boolean;
	noMargin?: boolean;
	fieldColumnIsMissing?: boolean;
	hideOptionalText?: boolean;
	labelRightSlot?: JSXElement;
	options?: RichTextOptions;
	translations?: {
		value: (locale: string) => RichTextJSON | null | undefined;
		onChange: (value: RichTextJSON, locale: string) => void;
	};
	onFullscreenChange?: (fullscreen: boolean) => void;
}

interface EditorFieldProps extends Omit<RichTextProps, "translations"> {
	fullscreen: boolean;
	onFullscreenChange: (fullscreen: boolean) => void;
}

const EditorField: Component<EditorFieldProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { editor, focused, setContainer } = useEditor({
		get value() {
			return props.value ?? null;
		},
		onChange: props.onChange,
		get disabled() {
			return props.disabled;
		},
		get options() {
			return props.options;
		},
	});

	// ----------------------------------------
	// Memos
	const seamless = createMemo(() => props.options?.appearance === "seamless");
	const showPlaceholder = createMemo(
		() => seamless() && !richTextHasContent(props.value),
	);

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("w-full max-w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<Show when={!seamless()}>
				<div class="relative">
					<Label
						id={props.id}
						label={props.copy?.label}
						focused={focused()}
						required={props.required}
						theme="basic"
						altLocaleError={props.altLocaleError}
						localised={props.localised}
						fieldColumnIsMissing={props.fieldColumnIsMissing}
						hideOptionalText={props.hideOptionalText}
						rightSlot={props.labelRightSlot}
					/>
				</div>
			</Show>
			<div
				class={classnames(
					"relative overflow-hidden transition-colors duration-200",
					{
						"rounded-md border border-border bg-input-base focus-within:border-primary-base":
							!seamless(),
						"bg-transparent": seamless(),
						"cursor-not-allowed opacity-80 pointer-events-none": props.disabled,
					},
				)}
			>
				<Show when={editor()}>
					{(instance) => (
						<Toolbar
							editor={instance()}
							disabled={props.disabled}
							options={props.options}
							fullscreen={props.fullscreen}
							onFullscreenChange={props.onFullscreenChange}
						/>
					)}
				</Show>
				<div class="relative">
					<Show when={showPlaceholder()}>
						<div class="pointer-events-none absolute top-3 left-0 z-10 text-sm text-unfocused">
							{props.copy?.placeholder || T()("editor.rich.text.placeholder")}
						</div>
					</Show>
					<div ref={setContainer} />
				</div>
			</div>
			<Show when={!seamless()}>
				<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			</Show>
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};

const FullscreenEditor: Component<{
	props: RichTextProps;
	contentLocale: Accessor<string | undefined>;
	onClose: () => void;
}> = (fullscreenProps) => {
	// ----------------------------------------
	// Memos
	const locale = createMemo(
		() =>
			fullscreenProps.contentLocale() ??
			fullscreenProps.props.options?.locale ??
			"",
	);
	const value = createMemo(() =>
		fullscreenProps.props.translations
			? fullscreenProps.props.translations.value(locale())
			: fullscreenProps.props.value,
	);
	const options = createMemo<RichTextOptions>(() => ({
		...fullscreenProps.props.options,
		appearance: "seamless",
		locale: locale(),
	}));

	// ----------------------------------------
	// Render
	return (
		<Show when={locale() || "__default"} keyed>
			{(localeKey) => (
				<EditorField
					{...fullscreenProps.props}
					value={value()}
					onChange={(nextValue) => {
						if (fullscreenProps.props.translations) {
							fullscreenProps.props.translations.onChange(
								nextValue,
								localeKey === "__default" ? "" : localeKey,
							);
							return;
						}
						fullscreenProps.props.onChange(nextValue);
					}}
					options={options()}
					fullscreen={true}
					onFullscreenChange={(open) => {
						if (!open) fullscreenProps.onClose();
					}}
					noMargin={true}
				/>
			)}
		</Show>
	);
};

export const RichText: Component<RichTextProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [fullscreen, setFullscreen] = createSignal(false);

	// ----------------------------------------
	// Functions
	const setFullscreenState = (open: boolean) => {
		setFullscreen(open);
		props.onFullscreenChange?.(open);
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<Show when={!fullscreen()}>
				<Show when={props.options?.locale || "__default"} keyed>
					{(_locale) => (
						<EditorField
							{...props}
							fullscreen={false}
							onFullscreenChange={setFullscreenState}
						/>
					)}
				</Show>
			</Show>
			<BottomPanel
				zIndex={60}
				state={{ open: fullscreen(), setOpen: setFullscreenState }}
				langauge={{
					contentLocale:
						props.localised === true && props.translations !== undefined,
				}}
				fetchState={{ isLoading: false, isError: false }}
				copy={{
					title: props.copy?.label,
					cancel: T()("common.done"),
				}}
				options={{
					padding: "24",
					growContent: true,
					fullHeight: true,
					primaryCloseAction: true,
				}}
			>
				{(language) => (
					<FullscreenEditor
						props={props}
						contentLocale={
							language?.contentLocale ?? (() => props.options?.locale)
						}
						onClose={() => setFullscreenState(false)}
					/>
				)}
			</BottomPanel>
		</>
	);
};

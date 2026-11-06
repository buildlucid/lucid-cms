import { useNavigate } from "@solidjs/router";
import type {
	Collection,
	InternalDocumentField,
	TranslationChange,
	TranslationFailure,
	TranslationStatus,
} from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	Show,
} from "solid-js";
import { unwrap } from "solid-js/store";
import Modal from "@/components/Modal/Modal";
import Select, { type SelectOption } from "@/components/Select/Select";
import SelectMultiple from "@/components/SelectMultiple/SelectMultiple";
import Skeleton from "@/components/Skeleton/Skeleton";
import Textarea from "@/components/Textarea/Textarea";
import api from "@/services/api";
import type { BrickData } from "@/store/brickStore/brickStore";
import T from "@/translations";
import { getLocaleName } from "@/utils/locale-name";
import { getRequestRoute } from "@/utils/route-helpers";
import spawnToast from "@/utils/spawn-toast";
import { describeTranslationNeeds } from "@/utils/translation-status";
import TranslateLocaleOption from "./parts/TranslateLocaleOption";

type Delivery = "request" | "editor";
type Mode = "update" | "overwrite";
type LocaleOption = { value: string; label: string; status?: string };

export interface TranslateModalProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	collection: Collection | undefined;
	documentIds: number[];
	/** The open editor, which can be filled with translations instead of opening requests. */
	editor?: {
		/** The editor's current content, including unsaved changes. */
		content: () => {
			bricks: BrickData[];
			fields: InternalDocumentField[];
		};
		/** Identifies what the editor has open, so translations only fill the content they were made from. */
		identity: () => string;
		/** Fills in the translations, given the editor and content they were made from. */
		onFill: (
			_changes: TranslationChange[],
			_submitted: {
				identity: string;
				content: { bricks: BrickData[]; fields: InternalDocumentField[] };
			},
		) => void;
	};
	/** Whether translations can go into requests, which needs request access. Defaults to true. */
	canRequest?: boolean;
	/** Called once translations are filled in or requests are opened. */
	onSuccess?: () => void;
}

/** Adds up documents' status per locale. */
const sumStatus = (statuses: TranslationStatus[][]) => {
	const totals = new Map<string, TranslationStatus>();
	for (const status of statuses.flat()) {
		const total = totals.get(status.locale);
		if (!total) {
			//* query data is a store proxy, which structuredClone can't copy
			totals.set(status.locale, { ...status, words: { ...status.words } });
			continue;
		}
		total.fields += status.fields;
		total.missing += status.missing;
		total.outdated += status.outdated;
		total.byPerson += status.byPerson;
		total.byPersonOutdated += status.byPersonOutdated;
		total.words.update += status.words.update;
		total.words.overwrite += status.words.overwrite;
	}
	return totals;
};

/**
 * Translates documents from their default locale with Lucid AI. Opens a request
 * per locale by default, or fills the open editor so people check the
 * translations before saving.
 */
const TranslateModal: Component<TranslateModalProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const [locales, setLocales] = createSignal<string[]>([]);
	const [mode, setMode] = createSignal<Mode>("update");
	const [delivery, setDelivery] = createSignal<Delivery>(
		props.canRequest === false ? "editor" : "request",
	);
	const [note, setNote] = createSignal("");

	// ----------------------------------------
	// Queries & Mutations
	const status = api.translations.useGetStatus({
		collectionKey: () => props.collection?.key,
		documentIds: () => props.documentIds,
		enabled: () => props.open,
	});
	const translate = api.translations.useTranslateDocuments();

	// ----------------------------------------
	// Memos
	const localization = createMemo(() => props.collection?.localized || null);
	const sourceLocale = createMemo(() => localization()?.defaultLocale);
	const targetLocales = createMemo(
		() =>
			localization()?.locales.filter((code) => code !== sourceLocale()) ?? [],
	);
	const totals = createMemo(() =>
		sumStatus((status.data?.data ?? []).map((document) => document.locales)),
	);
	const replacedByPerson = createMemo(() =>
		locales().reduce(
			(count, code) => count + (totals().get(code)?.byPerson ?? 0),
			0,
		),
	);
	//* the words of source text translating into each locale sends, in the chosen mode
	const localeWords = createMemo(
		() =>
			new Map(
				[...totals()].map(
					([code, total]) =>
						[
							code,
							mode() === "overwrite"
								? total.words.overwrite
								: total.words.update,
						] as const,
				),
			),
	);
	const words = createMemo(() =>
		locales().reduce(
			(count, code) => count + (localeWords().get(code) ?? 0),
			0,
		),
	);
	const modeOptions = createMemo((): Array<SelectOption & { value: Mode }> => [
		{
			value: "update",
			label: T()("translations.mode.update"),
			description: T()("translations.mode.update.description"),
		},
		{
			value: "overwrite",
			label: T()("translations.mode.overwrite"),
			description: T()("translations.mode.overwrite.description", {
				count: replacedByPerson(),
			}),
		},
	]);
	const deliveryOptions = createMemo(
		(): Array<SelectOption & { value: Delivery }> => [
			{
				value: "request",
				label: T()("translations.delivery.request"),
				description: T()("translations.delivery.request.description"),
			},
			{
				value: "editor",
				label: T()("translations.delivery.editor"),
				description: T()("translations.delivery.editor.description"),
			},
		],
	);
	const title = createMemo(() =>
		props.documentIds.length === 1
			? T()("translations.modal.title")
			: T()("translations.modal.title.many", {
					count: props.documentIds.length,
				}),
	);

	// ----------------------------------------
	// Functions
	const needsWork = (total: TranslationStatus | undefined) =>
		total !== undefined && total.missing + total.outdated > 0;
	const describeLocale = (code: string) => {
		const total = totals().get(code);
		if (!total) return undefined;
		const count = localeWords().get(code) ?? 0;
		const needs = describeTranslationNeeds(total);
		if (!needs && count === 0) return T()("translations.status.nothing");
		return [
			needs || T()("translations.status.current"),
			count > 0 ? T()("translations.modal.words", { count }) : undefined,
		]
			.filter(Boolean)
			.join(" · ");
	};
	const localeOptions = (): LocaleOption[] =>
		targetLocales().map((code) => ({
			value: code,
			label: getLocaleName(code, { withCode: true }),
			status: describeLocale(code),
		}));
	const reportFailures = (failures: TranslationFailure[]) => {
		const first = failures[0];
		if (!first) return;
		spawnToast({
			title: T()("translations.failures.title", { count: failures.length }),
			message: first.field ? `${first.field}: ${first.message}` : first.message,
			status: "warning",
		});
	};
	const submit = async () => {
		const collection = props.collection;
		if (!collection || locales().length === 0) return;

		const editor = delivery() === "editor" ? props.editor : undefined;
		const submitted = editor
			? {
					identity: editor.identity(),
					content: structuredClone(unwrap(editor.content())),
				}
			: undefined;
		//* a failure shows in the modal through translate.errors
		const response = await translate.action
			.mutateAsync({
				collectionKey: collection.key,
				body: {
					documentIds: props.documentIds,
					targetLocales: locales(),
					overwrite: mode() === "overwrite",
					note: note().trim() || undefined,
					delivery: editor ? "editor" : "request",
					content: submitted?.content,
				},
			})
			.catch(() => undefined);
		if (!response) return;
		const result = response.data;

		if (result.delivery === "editor") {
			if (submitted) editor?.onFill(result.changes, submitted);
			spawnToast({
				title: T()("translations.filled.title", {
					count: result.changes.length,
				}),
				message: T()("translations.filled.message"),
				status: result.changes.length > 0 ? "success" : "info",
			});
		} else if (result.queued) {
			spawnToast({
				title: T()("translations.queued.title"),
				message: T()("translations.queued.message"),
				status: "info",
			});
		} else {
			const [request, ...others] = result.requests;
			const documentId = props.documentIds[0];
			spawnToast({
				title: request
					? T()("translations.requests.title", {
							count: result.requests.length,
						})
					: T()("translations.requests.none"),
				message: request ? T()("translations.requests.message") : undefined,
				status: request ? "success" : "info",
				//* one request opens on its proposal when it holds one document, several on the requests list
				action: request
					? {
							label:
								others.length > 0
									? T()("translations.requests.view")
									: T()("requests.view"),
							onClick: () =>
								navigate(
									others.length > 0
										? "/admin/requests"
										: getRequestRoute({
												requestId: request.id,
												content:
													request.documents === 1 && documentId !== undefined
														? { collectionKey: collection.key, documentId }
														: undefined,
											}),
								),
						}
					: undefined,
			});
		}
		reportFailures(result.failures);
		props.onOpenChange(false);
		props.onSuccess?.();
	};

	// ----------------------------------------
	// Effects
	//* start with the locales that have something to translate, once their status loads
	createEffect(
		on(
			() => [props.open, status.data] as const,
			([open, data]) => {
				if (!open || !data) return;
				const pending = targetLocales().filter((code) =>
					needsWork(totals().get(code)),
				);
				setLocales(pending.length > 0 ? pending : targetLocales());
			},
		),
	);
	createEffect(() => {
		if (props.open) return;
		setLocales([]);
		setMode("update");
		setDelivery(props.canRequest === false ? "editor" : "request");
		setNote("");
		translate.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.open}
			onOpenChange={props.onOpenChange}
			title={title()}
			description={T()("translations.modal.description", {
				locale: getLocaleName(sourceLocale() ?? "", { withCode: true }),
			})}
			confirmLabel={T()("translations.modal.confirm")}
			confirmVariant="primary"
			loading={translate.action.isPending}
			confirmDisabled={locales().length === 0 || status.isLoading}
			error={translate.errors()?.message ?? status.error?.message}
			onConfirm={() => void submit()}
			footerStart={
				<Show
					when={!translate.action.isPending}
					fallback={
						<p class="animate-pulse text-sm text-body">
							{T()("translations.modal.pending")}
						</p>
					}
				>
					<Show when={words() > 0}>
						<p class="text-sm text-body">
							{T()("translations.modal.words", { count: words() })}
						</p>
					</Show>
				</Show>
			}
		>
			<div class="flex flex-col gap-4">
				<Show
					when={!status.isLoading}
					fallback={
						<Skeleton class="flex flex-col gap-2">
							<span class="skeleton block h-4 w-24" />
							<For each={targetLocales()}>
								{() => <span class="skeleton block h-12 w-full" />}
							</For>
						</Skeleton>
					}
				>
					<SelectMultiple
						id="translate-locales"
						name="translate-locales"
						label={T()("translations.modal.locales")}
						placeholder={T()("translations.modal.locales.placeholder")}
						variant="list"
						values={localeOptions().filter((option) =>
							locales().includes(option.value),
						)}
						onChange={(values) =>
							setLocales(values.map((value) => value.value))
						}
						options={localeOptions()}
						disabled={translate.action.isPending}
						renderValue={(option) => (
							<TranslateLocaleOption
								label={option.value.label}
								status={option.value.status}
								removeValue={option.removeValue}
							/>
						)}
						renderOption={(option) => (
							<TranslateLocaleOption
								label={option.option.label}
								status={option.option.status}
							/>
						)}
					/>
				</Show>
				<Select
					id="translate-mode"
					name="translate-mode"
					label={T()("translations.mode.label")}
					value={mode()}
					onChange={(value) => {
						if (value) setMode(value);
					}}
					options={modeOptions()}
					disabled={translate.action.isPending}
				/>
				<Show when={props.editor && props.canRequest !== false}>
					<Select
						id="translate-delivery"
						name="translate-delivery"
						label={T()("translations.delivery.label")}
						value={delivery()}
						onChange={(value) => {
							if (value) setDelivery(value);
						}}
						options={deliveryOptions()}
						disabled={translate.action.isPending}
					/>
				</Show>
				<Textarea
					id="translate-note"
					name="translate-note"
					value={note()}
					onChange={setNote}
					label={T()("translations.modal.note")}
					description={T()("translations.modal.note.description")}
					disabled={translate.action.isPending}
				/>
			</div>
		</Modal.Confirm>
	);
};

export default TranslateModal;

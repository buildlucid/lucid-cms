import type { Locale, TranslationGlossaryTerm } from "@types";
import {
	TbOutlineBook,
	TbOutlineLanguage,
	TbOutlineLetterT,
} from "solid-icons/tb";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import AiConnectionNotice from "@/components/AiConnectionNotice/AiConnectionNotice";
import Button from "@/components/Button/Button";
import CardState from "@/components/CardState/CardState";
import InfoRow from "@/components/InfoRow/InfoRow";
import Modal from "@/components/Modal/Modal";
import PageLayout from "@/components/PageLayout/PageLayout";
import Pill from "@/components/Pill/Pill";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import Table from "@/components/Table/Table";
import { Permissions } from "@/constants/permissions";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getLocaleName } from "@/utils/locale-name";
import GlossaryTermModal from "./parts/GlossaryTermModal";
import StyleNotesModal from "./parts/StyleNotesModal";

/** The glossary and per-language style notes that AI translations follow. Each change saves on its own. */
const SystemTranslationsPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.system.translations.title"));
	//* what a modal shows is kept while it closes, so its text doesn't empty mid-animation
	const [termOpen, setTermOpen] = createSignal(false);
	const [editingTerm, setEditingTerm] = createSignal<TranslationGlossaryTerm>();
	const [removeOpen, setRemoveOpen] = createSignal(false);
	const [removingTerm, setRemovingTerm] =
		createSignal<TranslationGlossaryTerm>();
	const [styleOpen, setStyleOpen] = createSignal(false);
	const [styleLocale, setStyleLocale] = createSignal<Locale>();

	// ----------------------------------------
	// Queries & Mutations
	const settings = api.translations.useGetSettings();
	const removeTerm = api.translations.useDeleteGlossaryTerm({
		onSuccess: () => setRemoveOpen(false),
	});

	// ----------------------------------------
	// Memos
	const canEdit = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsUpdate]).all,
	);
	const connected = createMemo(
		() => siteStore.get.connection?.status === "connected",
	);
	const glossary = createMemo(() => settings.data?.data.glossary ?? []);

	// ----------------------------------------
	// Functions
	const localeName = (code: string | null) =>
		code === null
			? T()("translations.glossary.locale.all")
			: getLocaleName(code, { withCode: true });
	const styleFor = (code: string | undefined) =>
		settings.data?.data.styles.find((style) => style.locale === code)
			?.instructions ?? "";
	const openTerm = (term?: TranslationGlossaryTerm) => {
		setEditingTerm(term);
		setTermOpen(true);
	};
	const openRemove = (term: TranslationGlossaryTerm) => {
		setRemovingTerm(term);
		removeTerm.reset();
		setRemoveOpen(true);
	};
	const openStyle = (locale: Locale) => {
		setStyleLocale(locale);
		setStyleOpen(true);
	};

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.system.translations.title")}
				description={T()("routes.system.translations.description")}
			/>
			<PageLayout.Body>
				<QueryBoundary
					loading={settings.isLoading}
					error={settings.isLoadingError}
					loadingFallback={
						<InfoRow.Root loading>
							<span class="skeleton block h-48 w-full" />
						</InfoRow.Root>
					}
					class="flex-1 h-full p-4 md:p-6"
				>
					<Show when={!connected()}>
						<InfoRow.Root
							title={T()("translations.connection.title")}
							description={T()("translations.connection.description")}
						>
							<AiConnectionNotice
								description={T()("translations.connection.notice")}
							/>
						</InfoRow.Root>
					</Show>
					<InfoRow.Root
						title={T()("translations.languages.title")}
						description={T()("translations.languages.description")}
					>
						<InfoRow.Content padding="none">
							<ul class="divide-y divide-border">
								<For each={contentLocaleStore.get.locales}>
									{(locale) => (
										<InfoRow.Item
											title={localeName(locale.code)}
											badge={
												locale.isDefault ? (
													<Pill size="sm" variant="outline">
														{T()("translations.languages.default")}
													</Pill>
												) : undefined
											}
											description={
												styleFor(locale.code) || T()("translations.styles.none")
											}
											actions={
												<Show when={canEdit()}>
													<Button
														variant="outline"
														size="sm"
														onClick={() => openStyle(locale)}
													>
														{T()("translations.styles.edit")}
													</Button>
												</Show>
											}
										/>
									)}
								</For>
							</ul>
						</InfoRow.Content>
					</InfoRow.Root>
					<InfoRow.Root
						title={T()("translations.glossary.title")}
						description={T()("translations.glossary.description")}
						aside={
							canEdit() ? (
								<Button variant="outline" size="sm" onClick={() => openTerm()}>
									{T()("translations.glossary.add")}
								</Button>
							) : undefined
						}
					>
						<InfoRow.Content padding="none">
							<Show
								when={glossary().length > 0}
								fallback={
									<CardState
										icon={<TbOutlineBook />}
										title={T()("translations.glossary.empty.title")}
										description={T()("translations.glossary.empty.description")}
									/>
								}
							>
								<Table.Root
									id="translations.glossary"
									rowCount={glossary().length}
									columns={[
										{
											label: T()("translations.glossary.term"),
											key: "term",
											icon: <TbOutlineLetterT />,
										},
										{
											label: T()("translations.glossary.locale"),
											key: "locale",
											icon: <TbOutlineLanguage />,
										},
										{
											label: T()("translations.glossary.translation"),
											key: "translation",
											icon: <TbOutlineLetterT />,
										},
									]}
									padding="sm"
									variant="contained"
									class="border-y-0"
								>
									<For each={glossary()}>
										{(term, index) => (
											<Table.Row
												index={index()}
												actions={[
													{
														label: T()("common.edit"),
														type: "button",
														icon: "pen",
														onClick: () => openTerm(term),
														permission: Permissions.SettingsUpdate,
													},
													{
														label: T()("translations.glossary.delete"),
														type: "button",
														icon: "trash",
														onClick: () => openRemove(term),
														permission: Permissions.SettingsUpdate,
														excludeFromRowClick: true,
														variant: "danger",
													},
												]}
											>
												<Table.Text
													column="term"
													text={term.term}
													maxLines={1}
												/>
												<Table.Text
													column="locale"
													text={localeName(term.locale)}
													maxLines={1}
												/>
												<Table.Text
													column="translation"
													text={
														term.translation ??
														T()("translations.glossary.kept")
													}
													maxLines={1}
												/>
											</Table.Row>
										)}
									</For>
								</Table.Root>
							</Show>
						</InfoRow.Content>
					</InfoRow.Root>
				</QueryBoundary>
			</PageLayout.Body>
			<GlossaryTermModal
				open={termOpen()}
				onOpenChange={setTermOpen}
				term={editingTerm()}
			/>
			<StyleNotesModal
				open={styleOpen()}
				onOpenChange={setStyleOpen}
				locale={styleLocale()}
				instructions={styleFor(styleLocale()?.code)}
			/>
			<Modal.Confirm
				open={removeOpen()}
				onOpenChange={setRemoveOpen}
				title={T()("translations.glossary.delete")}
				description={T()("translations.glossary.delete.description", {
					term: removingTerm()?.term ?? "",
				})}
				confirmLabel={T()("common.delete")}
				loading={removeTerm.action.isPending}
				error={removeTerm.errors()?.message}
				onConfirm={() => {
					const term = removingTerm();
					if (term) removeTerm.action.mutate({ id: term.id });
				}}
			/>
		</PageLayout.Root>
	);
};

export default SystemTranslationsPage;

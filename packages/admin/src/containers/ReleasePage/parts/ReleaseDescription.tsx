import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Release } from "@types";
import { FaSolidPen } from "solid-icons/fa";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { richTextHasContent } from "@/components/RichText/helpers";
import RichText from "@/components/RichText/RichText";
import RichTextContent from "@/components/RichTextContent/RichTextContent";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import api from "@/services/api";
import T from "@/translations";

export const ReleaseDescription: Component<{
	release: Release;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [editing, setEditing] = createSignal(false);
	const [body, setBody] = createSignal<RichTextJSON | null>(null);

	// ----------------------------------------
	// Queries & Mutations
	const update = api.releases.useUpdateSingle({
		onSuccess: () => setEditing(false),
	});

	// ----------------------------------------
	// Memos
	const hasDescription = createMemo(() =>
		richTextHasContent(props.release.description ?? undefined),
	);

	// ----------------------------------------
	// Functions
	const startEditing = () => {
		setBody(props.release.description);
		update.reset();
		setEditing(true);
	};
	const save = () => {
		const value = body();
		update.action.mutate({
			id: props.release.id,
			body: {
				description: value && richTextHasContent(value) ? value : null,
			},
		});
	};

	// ----------------------------------------
	// Render
	return (
		<section>
			<SectionHeading
				title={T()("releases.description.title")}
				actions={
					<Show when={props.release.permissions.edit && !editing()}>
						<Button
							variant="ghost"
							size="xs"
							shape="square"
							aria-label={T()("releases.description.edit")}
							title={T()("releases.description.edit")}
							onClick={startEditing}
						>
							<FaSolidPen size={10} />
						</Button>
					</Show>
				}
			/>
			<Show
				when={editing()}
				fallback={
					<Show
						when={hasDescription() ? props.release.description : undefined}
						fallback={
							<p class="text-sm text-muted">
								{T()("releases.description.empty")}
							</p>
						}
					>
						{(description) => (
							<div class="text-sm text-subtitle">
								<RichTextContent value={description()} />
							</div>
						)}
					</Show>
				}
			>
				<div class="grid gap-2">
					<RichText
						id="release-description"
						name="release-description"
						value={body()}
						onChange={setBody}
						placeholder={T()("releases.description.placeholder")}
						headings={false}
					/>
					<ErrorMessage theme="basic" message={update.errors()?.message} />
					<div class="flex justify-end gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() => setEditing(false)}
						>
							{T()("common.cancel")}
						</Button>
						<Button size="sm" loading={update.action.isPending} onClick={save}>
							{T()("common.save")}
						</Button>
					</div>
				</div>
			</Show>
		</section>
	);
};

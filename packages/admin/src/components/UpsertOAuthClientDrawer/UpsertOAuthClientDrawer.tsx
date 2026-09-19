import type {
	ErrorResponse,
	OAuthClientAuthMethod,
	OAuthClientCreateResponse,
} from "@types";
import { FaSolidPlus, FaSolidXmark } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
	on,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import CompactImageUpload from "@/components/CompactImageUpload/CompactImageUpload";
import { Drawer } from "@/components/Drawer/Drawer";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import { Input } from "@/components/Input/Input";
import InputGrid from "@/components/InputGrid/InputGrid";
import { Select } from "@/components/Select/Select";
import { Switch } from "@/components/Switch/Switch";
import useSingleFileUpload from "@/hooks/useSingleFileUpload/useSingleFileUpload";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import getMediaPreviewUrl from "@/utils/media-preview";
import { uploadMediaFile } from "@/utils/upload-session";

const UpsertOAuthClientDrawer: Component<{
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	onCreate?: (_credentials: OAuthClientCreateResponse) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [name, setName] = createSignal("");
	const [clientUri, setClientUri] = createSignal("");
	const [authMethod, setAuthMethod] =
		createSignal<OAuthClientAuthMethod>("none");
	const [redirectUris, setRedirectUris] = createSignal<string[]>([""]);
	const [enabled, setEnabled] = createSignal(true);
	const [uploadErrors, setUploadErrors] = createSignal<ErrorResponse>();
	const [uploadLoading, setUploadLoading] = createSignal(false);
	const [uploadProgress, setUploadProgress] = createSignal(0);

	const mode = createMemo(() =>
		props.id?.() === undefined ? "create" : "update",
	);
	const LogoFile = useSingleFileUpload({
		id: "oauth-client-logo",
		name: "logo",
		accept: "image/*",
		copy: {
			label: T()("oauth.clients.logo"),
		},
		errors: () => mutateErrors(),
		progress: () => ({
			active: uploadLoading(),
			value: uploadProgress(),
		}),
		imageCrop: {},
	});

	// ----------------------------------------
	// Queries
	const client = api.oauthClients.useGetSingle({
		queryParams: {
			id: () => props.id?.(),
		},
		key: () => props.state.open,
		enabled: () => props.state.open && mode() === "update",
	});

	// ----------------------------------------
	// Mutations
	const createUploadSession = api.oauthClients.useCreateLogoUploadSession();
	const createClient = api.oauthClients.useCreateSingle({
		onSuccess: (response) => {
			props.state.setOpen(false);
			props.onCreate?.(response.data);
		},
	});
	const updateClient = api.oauthClients.useUpdateSingle({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Memos
	const mutateErrors = createMemo(
		() =>
			createClient.errors() ||
			updateClient.errors() ||
			createUploadSession.errors() ||
			uploadErrors(),
	);
	const isLoading = createMemo(
		() =>
			createClient.action.isPending ||
			updateClient.action.isPending ||
			createUploadSession.action.isPending ||
			uploadLoading(),
	);
	const isDisabled = createMemo(
		() =>
			name().trim().length < 2 ||
			redirectUris().length === 0 ||
			redirectUris().some((uri) => uri.trim().length === 0),
	);
	const panelTitle = createMemo(() =>
		mode() === "create"
			? T()("oauth.clients.create.title")
			: T()("oauth.clients.update.title"),
	);

	// ----------------------------------------
	// Effects
	createEffect(
		on([() => props.state.open, () => client.data?.data.id], ([open]) => {
			if (!open || mode() !== "update" || !client.data?.data) return;

			const value = client.data.data;
			setName(value.name);
			setClientUri(value.clientUri ?? "");
			setAuthMethod(value.authMethod);
			setRedirectUris(value.redirectUris);
			setEnabled(value.enabled);
			LogoFile.setCurrentFile(
				value.logo
					? {
							name: value.logo.fileName ?? value.logo.key,
							url: getMediaPreviewUrl(value.logo, "thumbnail-medium"),
							originalUrl: value.logo.url,
							type: value.logo.type,
							mimeType: value.logo.meta.mimeType,
							origin: value.logo.origin,
							width: value.logo.meta.width,
							height: value.logo.meta.height,
						}
					: undefined,
			);
		}),
	);

	// ----------------------------------------
	// Functions
	const updateRedirectUri = (index: number, value: string) => {
		setRedirectUris((current) =>
			current.map((uri, itemIndex) => (itemIndex === index ? value : uri)),
		);
	};
	const removeRedirectUri = (index: number) => {
		setRedirectUris((current) =>
			current.filter((_, itemIndex) => itemIndex !== index),
		);
	};
	const addRedirectUri = (index: number) => {
		setRedirectUris((current) => [
			...current.slice(0, index + 1),
			"",
			...current.slice(index + 1),
		]);
	};
	const uploadLogo = async () => {
		const cropFile = LogoFile.getCropFile();
		const file = cropFile ?? LogoFile.getFile();
		if (!file) return undefined;

		setUploadErrors(undefined);
		setUploadLoading(true);
		setUploadProgress(0);
		try {
			const [upload, imageMeta] = await Promise.all([
				uploadMediaFile({
					file,
					scope: `oauth-client-logo:${props.id?.() ?? "create"}`,
					start: () =>
						createUploadSession.action.mutateAsync({
							id: props.id?.(),
							body: {
								fileName: file.name,
								mimeType: file.type,
								size: file.size,
							},
						}),
					onProgress: setUploadProgress,
				}),
				cropFile ? LogoFile.getCropImageMeta() : LogoFile.getImageMeta(),
			]);
			if (upload.error) {
				setUploadErrors(upload.error);
				return null;
			}

			return {
				key: upload.data,
				fileName: file.name,
				width: imageMeta?.width,
				height: imageMeta?.height,
				blurHash: imageMeta?.blurHash,
				averageColor: imageMeta?.averageColor,
				base64: imageMeta?.base64,
				isDark: imageMeta?.isDark,
				isLight: imageMeta?.isLight,
			};
		} finally {
			setUploadLoading(false);
		}
	};
	const submit = async () => {
		const logo = await uploadLogo();
		if (logo === null) return;

		const common = {
			name: name().trim(),
			redirectUris: redirectUris().map((uri) => uri.trim()),
			enabled: enabled(),
			...(logo ? { logo } : {}),
		};
		if (mode() === "create") {
			createClient.action.mutate({
				...common,
				clientUri: clientUri().trim() || undefined,
				authMethod: authMethod(),
			});
			return;
		}

		updateClient.action.mutate({
			id: props.id?.() as number,
			body: {
				...common,
				clientUri: clientUri().trim() || null,
				removeLogo: LogoFile.getRemovedCurrent(),
			},
		});
	};
	const reset = () => {
		setName("");
		setClientUri("");
		setAuthMethod("none");
		setRedirectUris([""]);
		setEnabled(true);
		setUploadErrors(undefined);
		setUploadProgress(0);
		LogoFile.setCurrentFile(undefined);
		LogoFile.reset();
		createClient.reset();
		updateClient.reset();
		createUploadSession.reset();
	};

	// ----------------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={mode() === "update" && client.isLoading}
			error={
				mode() === "update" && client.isError
					? T()("errors.generic.message")
					: undefined
			}
			onReset={reset}
		>
			<Drawer.Header>
				<Drawer.Title>{panelTitle()}</Drawer.Title>
				<Drawer.Description>
					{T()("oauth.clients.panel.description")}
				</Drawer.Description>
			</Drawer.Header>
			<Drawer.Form onSubmit={submit}>
				<Drawer.Body class="flex flex-col gap-3">
					{/* Status */}
					<Switch
						id="oauth-client-enabled"
						name="enabled"
						value={enabled()}
						onChange={setEnabled}
						label={T()("common.status.enabled")}
						errors={getBodyError("enabled", mutateErrors)}
					/>

					{/* Application */}
					<InputGrid columns={2}>
						<Input
							id="oauth-client-name"
							name="name"
							type="text"
							value={name()}
							onChange={setName}
							label={T()("common.name")}
							required={true}
							errors={getBodyError("name", mutateErrors)}
						/>
						<Select
							id="oauth-client-auth-method"
							name="authMethod"
							value={authMethod()}
							onChange={(value) =>
								setAuthMethod(value as OAuthClientAuthMethod)
							}
							options={[
								{
									value: "none",
									label: T()("oauth.clients.auth.public"),
								},
								{
									value: "client_secret_basic",
									label: T()("oauth.clients.auth.confidential"),
								},
							]}
							label={T()("oauth.clients.auth.method")}
							required={true}
							disabled={mode() === "update"}
							errors={getBodyError("authMethod", mutateErrors)}
						/>
					</InputGrid>
					<Input
						id="oauth-client-uri"
						name="clientUri"
						type="url"
						value={clientUri()}
						onChange={setClientUri}
						label={T()("oauth.clients.website")}
						placeholder={"https://example.com"}
						errors={getBodyError("clientUri", mutateErrors)}
					/>

					{/* Redirect URIs */}
					<div>
						<FormLabel
							id="oauth-client-redirect-0"
							label={T()("oauth.clients.redirect.uris")}
							required={true}
							theme="basic"
						/>
						<div class="space-y-2.5">
							<Index each={redirectUris()}>
								{(uri, index) => (
									<div class="flex w-full items-center gap-2.5">
										<div class="min-w-0 flex-1">
											<Input
												id={`oauth-client-redirect-${index}`}
												name={`redirectUris.${index}`}
												type="url"
												value={uri()}
												onChange={(value) => updateRedirectUri(index, value)}
												placeholder={"https://example.com/oauth/callback"}
												required={true}
											/>
										</div>
										<div class="flex h-10 items-center gap-2.5">
											<Button
												type="button"
												variant="danger-outline"
												size="sm"
												shape="square"
												class="h-10! w-10! min-w-[40px]!"
												onClick={() => removeRedirectUri(index)}
												disabled={redirectUris().length === 1}
												title={T()("common.remove")}
												aria-label={T()("common.remove")}
											>
												<FaSolidXmark class="size-3.5" />
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												shape="square"
												class="h-10! w-10! min-w-[40px]!"
												onClick={() => addRedirectUri(index)}
												disabled={redirectUris().length >= 20}
												title={T()("oauth.clients.redirect.add")}
												aria-label={T()("oauth.clients.redirect.add")}
											>
												<FaSolidPlus class="size-3.5" />
											</Button>
										</div>
									</div>
								)}
							</Index>
						</div>
					</div>

					{/* Branding */}
					<CompactImageUpload
						id="oauth-client-logo"
						name="logo"
						state={{
							value: LogoFile.getCropFile() ?? LogoFile.getFile(),
							setValue: LogoFile.setGetFile,
							removedCurrent: LogoFile.getRemovedCurrent(),
							setRemovedCurrent: LogoFile.setGetRemovedCurrent,
						}}
						currentFile={LogoFile.getCurrentFile()}
						copy={{ label: T()("oauth.clients.logo") }}
						accept="image/*"
						progress={{
							active: uploadLoading(),
							value: uploadProgress(),
						}}
						imageCrop={LogoFile.getImageCrop()}
						errors={getBodyError("logo", mutateErrors)}
					/>
					<LogoFile.RenderImageCropEditor />
				</Drawer.Body>
				<Drawer.Footer>
					<ErrorMessage theme="basic" message={mutateErrors()?.message} />
					<Drawer.Actions>
						<Button
							size="md"
							variant="outline"
							onClick={() => props.state.setOpen(false)}
						>
							{T()("common.close")}
						</Button>
						<Show
							when={
								mode() === "create"
									? T()("common.create")
									: T()("common.update")
							}
						>
							<Button
								type="submit"
								variant="primary"
								size="md"
								loading={isLoading()}
								disabled={isDisabled()}
							>
								{mode() === "create"
									? T()("common.create")
									: T()("common.update")}
							</Button>
						</Show>
					</Drawer.Actions>
				</Drawer.Footer>
			</Drawer.Form>
		</Drawer.Root>
	);
};

export default UpsertOAuthClientDrawer;

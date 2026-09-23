import { demoLoginEnabled } from "@/lib/auth/demoSession";
import { WindowsLogo } from "@phosphor-icons/react";
import { useI18n } from "@/contexts/I18nContext";
import { GoogleLogo, SignOut } from "@/components/ui/icons";
import type { User } from "@supabase/supabase-js";
import { type FormEvent, useEffect, useState } from "react";
import {
	Modal,
	Button,
	Form,
	TextField,
	Input,
	Label,
	Description,
	FieldError,
	Separator,
	Alert,
} from "@heroui/react";
import {
	sendPasswordReset,
	signInWithEmail,
	signInWithSocial,
	signOutRecordly,
} from "@/lib/auth/recordlyAuth";

export type SignInReason = "account" | "share";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reason?: SignInReason;
	user: User | null;
	configured: boolean;
	callbackError?: string;
	onAuthenticated: () => void;
};

function friendlyAuthError(
	error: unknown,
	action: string,
	t: ReturnType<typeof useI18n>["t"],
): string {
	const message = error instanceof Error ? error.message : String(error);
	if (/unsupported provider|provider is not enabled/i.test(message)) {
		if (action === "google") {
			return t("editor.cloud.googleUnavailable");
		}
		if (action === "azure") return "Microsoft sign-in is not available yet.";
		return t("editor.cloud.providerUnavailable");
	}
	return message;
}

export function RecordlySignInDialog({
	open,
	onOpenChange,
	reason = "account",
	user,
	configured,
	callbackError,
	onAuthenticated,
}: Props) {
	const { t } = useI18n();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState<string>();
	const [message, setMessage] = useState<string>();
	const [resetSent, setResetSent] = useState(false);

	useEffect(() => {
		if (!open) {
			setPassword("");
			setBusy(undefined);
			setMessage(undefined);
			setResetSent(false);
		}
	}, [open]);

	useEffect(() => {
		if (open && user && reason === "share") onAuthenticated();
	}, [onAuthenticated, open, reason, user]);

	const run = async (label: string, action: () => Promise<unknown>) => {
		setBusy(label);
		setMessage(undefined);
		setResetSent(false);
		try {
			await action();
		} catch (error) {
			setMessage(friendlyAuthError(error, label, t));
		} finally {
			setBusy(undefined);
		}
	};

	const submitEmail = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if ((!configured && !demoLoginEnabled) || busy) return;
		void run("email", async () => {
			if (!configured && email.trim().toLowerCase() !== "test@email.com") {
				throw new Error("Email sign-in is not available yet.");
			}
			await signInWithEmail(email.trim(), password);
			onAuthenticated();
		});
	};

	const forgotPassword = () => {
		if (!email.trim()) {
			setMessage(t("editor.cloud.enterEmail"));
			return;
		}
		void run("reset", async () => {
			await sendPasswordReset(email.trim());
			setMessage(t("editor.cloud.resetSent"));
			setResetSent(true);
		});
	};

	const disabled = Boolean(busy);
	const expanded = email.trim().length > 0;
	const artwork = `${import.meta.env.BASE_URL}wallpapers/wallpaper1.jpg`;
	return (
		<Modal isOpen={open} onOpenChange={onOpenChange}>
			<Modal.Backdrop
				className="bg-cover bg-center"
				style={{
					backgroundImage: `linear-gradient(#10102066, #10102066), url(${artwork})`,
				}}
			>
				<Modal.Container size="cover" placement="center" className="p-4 sm:p-8">
					<Modal.Dialog className="grid h-[min(760px,calc(100dvh-64px))] min-h-0 w-full max-w-[1120px] grid-cols-1 gap-0 overflow-hidden rounded-[32px] p-2 md:grid-cols-2">
						<Modal.CloseTrigger
							aria-label={t("common.actions.close")}
							className="z-20"
						/>
						<div className="flex min-h-0 items-center justify-center overflow-y-auto px-6 py-10 sm:px-10">
							<div className="my-auto w-full max-w-[340px] space-y-7">
								<Modal.Header className="items-center text-center">
									<Modal.Heading className="text-4xl font-semibold tracking-tight">
										{user ? "Your account" : "Welcome back"}
									</Modal.Heading>
									<Description className="text-sm">
										{user
											? user.email
											: reason === "share"
												? "Sign in to share your recordings."
												: "Sign in to your Recordly account."}
									</Description>
								</Modal.Header>
								{user ? (
									<Button
										variant="secondary"
										className="w-full"
										isDisabled={disabled}
										onPress={() => void run("signout", signOutRecordly)}
									>
										<SignOut className="size-4" />
										{busy === "signout"
											? t("editor.cloud.signingOut")
											: t("editor.cloud.signOut")}
									</Button>
								) : (
									<>
										<div className="grid grid-cols-2 gap-3">
											<Button
												variant="secondary"
												className="h-11 w-full rounded-xl"
												isDisabled={disabled || !configured}
												onPress={() =>
													void run("google", () =>
														signInWithSocial("google"),
													)
												}
											>
												<GoogleLogo className="size-5" />
												Google
											</Button>
											<Button
												variant="secondary"
												className="h-11 w-full rounded-xl"
												isDisabled={disabled || !configured}
												onPress={() =>
													void run("azure", () =>
														signInWithSocial("azure"),
													)
												}
											>
												<WindowsLogo className="size-5" />
												Microsoft
											</Button>
										</div>
										<div className="flex items-center gap-4">
											<Separator className="flex-1" />
											<span className="text-xs text-muted">
												or continue with email
											</span>
											<Separator className="flex-1" />
										</div>
										<Form
											className="flex flex-col gap-5"
											onSubmit={submitEmail}
										>
											<TextField
												name="email"
												type="email"
												value={email}
												onChange={(value) => {
													setEmail(value);
													setMessage(undefined);
													if (!value.trim()) setPassword("");
												}}
												isRequired
												isDisabled={disabled}
											>
												<Label>Email</Label>
												<Input
													className="h-12 rounded-xl bg-default/50 shadow-none"
													placeholder="you@example.com"
													autoComplete="email"
												/>
												<FieldError />
											</TextField>
											{expanded && (
												<div className="flex flex-col gap-5">
													<TextField
														name="password"
														type="password"
														value={password}
														onChange={setPassword}
														isRequired
														isDisabled={disabled}
													>
														<Label>Password</Label>
														<Input
															className="h-12 rounded-xl bg-default/50 shadow-none"
															autoComplete="current-password"
														/>
														<FieldError />
													</TextField>
													{configured && (
														<Button
															variant="ghost"
															size="sm"
															className="-mt-3 self-end"
															isDisabled={disabled}
															onPress={forgotPassword}
														>
															{t("editor.cloud.forgotPassword")}
														</Button>
													)}
													<Button
														type="submit"
														className="h-12 w-full rounded-xl"
														isDisabled={
															disabled ||
															(!configured && !demoLoginEnabled)
														}
													>
														{busy === "email"
															? t("editor.cloud.signingIn")
															: "Sign in"}
													</Button>
												</div>
											)}
										</Form>
									</>
								)}
								{message || callbackError ? (
									<Alert
										status={resetSent && !callbackError ? "success" : "danger"}
									>
										<Alert.Indicator />
										<Alert.Content>
											<Alert.Description>
												{message || callbackError}
											</Alert.Description>
										</Alert.Content>
									</Alert>
								) : null}
								{!configured && !demoLoginEnabled && !user && (
									<Description role="status">
										{t("editor.cloud.unavailable")}
									</Description>
								)}
							</div>
						</div>
						<div className="relative hidden min-h-0 overflow-hidden rounded-[26px] md:block">
							<img
								src={artwork}
								alt=""
								className="absolute inset-0 size-full object-cover"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
							<span className="absolute left-8 top-8 text-lg font-semibold tracking-tight text-white">
								Recordly
							</span>
							<p className="absolute bottom-10 left-8 right-8 text-4xl font-light leading-tight tracking-tight text-white">
								Make something
								<br />
								<strong className="font-semibold">worth sharing.</strong>
							</p>
						</div>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</Modal>
	);
}

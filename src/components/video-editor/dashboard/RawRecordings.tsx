import { Button, Input, Modal } from "@heroui/react";
import { useCallback, useEffect, useState } from "react";
import { File, FolderOpen } from "@/components/ui/icons";
import { toast } from "@/components/ui/toast";
import type { RecordingLibraryEntry } from "@/types/recordingLibrary";
export function RawRecordings() {
	const [entries, setEntries] = useState<RecordingLibraryEntry[]>([]);
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [preview, setPreview] = useState<RecordingLibraryEntry | null>(null);
	const refresh = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const result = await window.electronAPI.listRecordings(true);
			if (!result.success) throw Error(result.error);
			setEntries(result.value);
		} catch (error) {
			setError(error instanceof Error ? error.message : "Could not load raw recordings");
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => {
		void refresh();
	}, [refresh]);
	const reveal = async (path?: string) => {
		try {
			const result = path
				? { success: true, path }
				: await window.electronAPI.getRecordingsDirectory();
			if (!result.success || !result.path) throw Error("Could not open recordings folder");
			await window.electronAPI.revealInFolder(result.path);
		} catch {
			toast.error("Could not show recordings in folder");
		}
	};
	const visible = entries.filter((entry) =>
		entry.name.toLowerCase().includes(query.trim().toLowerCase()),
	);
	return (
		<section aria-label="Raw recordings" className="py-10">
			<header className="mb-8 flex items-center justify-between gap-5">
				<div>
					<h1 className="text-lg font-semibold">Raw</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Original screen recordings, camera footage, and audio files.
					</p>
				</div>
				<Button variant="secondary" onPress={() => void reveal()}>
					<FolderOpen />
					Show folder
				</Button>
			</header>
			<Input
				aria-label="Search raw files"
				placeholder="Search raw files…"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="mb-6 w-full"
			/>
			{loading ? (
				<p role="status" className="py-12 text-sm text-muted-foreground">
					Loading recordings…
				</p>
			) : error ? (
				<div role="alert">
					<p>{error}</p>
					<Button variant="secondary" onPress={() => void refresh()}>
						Retry
					</Button>
				</div>
			) : visible.length ? (
				<ul aria-label="Raw files" className="space-y-3">
					{visible.map((entry) => (
						<li
							key={entry.path}
							className="flex items-center gap-4 rounded-xl bg-default/20 p-4"
						>
							<File className="size-6 shrink-0 text-muted-foreground" />
							<Button
								variant="ghost"
								className="h-auto min-w-0 flex-1 justify-start p-0 text-left"
								onPress={() => setPreview(entry)}
							>
								<span className="min-w-0">
									<span className="block truncate text-sm">{entry.name}</span>
									<span className="mt-1 block text-xs text-muted-foreground">
										{new Date(entry.createdAt).toLocaleDateString()} ·{" "}
										{(entry.bytes / 1048576).toFixed(1)} MB
									</span>
								</span>
							</Button>
							<Button
								isIconOnly
								variant="ghost"
								aria-label={`Show ${entry.name} in folder`}
								onPress={() => void reveal(entry.path)}
							>
								<FolderOpen className="size-4" />
							</Button>
						</li>
					))}
				</ul>
			) : (
				<p className="py-12 text-center text-sm text-muted-foreground">
					{query ? "No matching raw files" : "No raw recordings yet"}
				</p>
			)}
			<Modal
				isOpen={!!preview}
				onOpenChange={(open) => {
					if (!open) setPreview(null);
				}}
			>
				<Modal.Backdrop>
					<Modal.Container size="lg">
						<Modal.Dialog aria-label="Raw file preview">
							<Modal.CloseTrigger />
							<Modal.Header>
								<Modal.Heading>{preview?.name}</Modal.Heading>
							</Modal.Header>
							<Modal.Body>
								{preview &&
									(/\.(wav|m4a|mp3|ogg|flac)$/i.test(preview.name) ? (
										<audio controls src={preview.url} className="w-full" />
									) : (
										<video
											controls
											src={preview.url}
											className="max-h-[65vh] w-full rounded-xl"
										/>
									))}
							</Modal.Body>
						</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			</Modal>
		</section>
	);
}

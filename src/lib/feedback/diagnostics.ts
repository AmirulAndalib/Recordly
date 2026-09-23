const entries: string[] = [];
let installed = false;
export function redactDiagnostic(value: string): string {
	return value
		.replace(/Bearer\s+[^\s"']+/gi, "Bearer [redacted]")
		.replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, "[token]")
		.replace(
			/((?:token|password|secret|authorization|api[_-]?key)["']?\s*[:=]\s*)[^\s,}]+/gi,
			"$1[redacted]",
		)
		.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
		.replace(/(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)[^\s"']+/gi, "[local path]")
		.replace(/https?:\/\/[^\s"']+/g, "[url]")
		.slice(0, 2000);
}
function record(level: string, args: unknown[]) {
	// Do not serialize arbitrary objects: they may contain session or project data.
	const message = args
		.map((value) =>
			value instanceof Error
				? value.message
				: typeof value === "string"
					? value
					: `[${typeof value}]`,
		)
		.join(" ");
	entries.push(`${new Date().toISOString()} ${level}: ${redactDiagnostic(message)}`);
	if (entries.length > 100) entries.shift();
}
export function installFeedbackDiagnostics() {
	if (installed) return;
	installed = true;
	for (const level of ["warn", "error"] as const) {
		const original = console[level].bind(console);
		console[level] = (...args: unknown[]) => {
			record(level, args);
			original(...args);
		};
	}
	window.addEventListener("error", (event) => record("error", [event.message]));
	window.addEventListener("unhandledrejection", (event) => record("rejection", [event.reason]));
}
export function feedbackDiagnostics() {
	return JSON.stringify(
		{
			capturedAt: new Date().toISOString(),
			platform: navigator.platform,
			userAgent: navigator.userAgent,
			logs: [...entries],
		},
		null,
		2,
	);
}

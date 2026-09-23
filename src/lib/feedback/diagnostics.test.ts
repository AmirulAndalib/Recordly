import { describe, expect, it } from "vitest";
import { redactDiagnostic } from "./diagnostics";
import { validateAttachments } from "./submitFeedback";

describe("feedback diagnostics", () => {
	it("removes common secrets and personal paths from log messages", () => {
		const result = redactDiagnostic(
			"Bearer abc123 password=hunter2 someone@example.com /Users/young/private.txt https://example.com?token=abc",
		);
		for (const secret of ["abc123", "hunter2", "someone@example.com", "young", "example.com"])
			expect(result).not.toContain(secret);
	});
	it("bounds individual log entries", () =>
		expect(redactDiagnostic("x".repeat(5000))).toHaveLength(2000));
	it("enforces attachment count, total size, and nonempty files", () => {
		const file = (size: number) => ({ size }) as File;
		expect(validateAttachments(Array.from({ length: 6 }, () => file(1)))).toBeTruthy();
		expect(validateAttachments([file(6 * 1024 * 1024), file(5 * 1024 * 1024)])).toBeTruthy();
		expect(validateAttachments([file(0)])).toBeTruthy();
		expect(validateAttachments([file(100)])).toBeNull();
	});
});

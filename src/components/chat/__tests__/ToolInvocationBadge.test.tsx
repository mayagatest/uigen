import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// --- getToolLabel unit tests ---

test("getToolLabel: str_replace_editor create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "src/components/Card.tsx" })).toBe("Creating file: Card.tsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "src/components/Card.tsx" })).toBe("Editing file: Card.tsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "src/components/Card.tsx" })).toBe("Editing file: Card.tsx");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "src/components/Card.tsx" })).toBe("Viewing file: Card.tsx");
});

test("getToolLabel: str_replace_editor undo_edit", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "src/components/Card.tsx" })).toBe("Undoing edit: Card.tsx");
});

test("getToolLabel: str_replace_editor unknown command defaults to Editing", () => {
  expect(getToolLabel("str_replace_editor", { command: "unknown", path: "src/components/Card.tsx" })).toBe("Editing file: Card.tsx");
});

test("getToolLabel: file_manager rename", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "src/components/Card.tsx", new_path: "src/components/NewCard.tsx" })).toBe("Renaming file: Card.tsx → NewCard.tsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "src/components/Card.tsx" })).toBe("Deleting file: Card.tsx");
});

test("getToolLabel: unknown tool returns raw tool name", () => {
  expect(getToolLabel("some_other_tool", { path: "src/foo.ts" })).toBe("some_other_tool");
});

test("getToolLabel: extracts filename from nested path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "a/b/c/Button.tsx" })).toBe("Creating file: Button.tsx");
});

// --- ToolInvocationBadge render tests ---

test("ToolInvocationBadge shows label and spinner when loading", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "src/components/Card.tsx" },
        state: "call",
      }}
    />
  );

  expect(screen.getByText("Creating file: Card.tsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolInvocationBadge shows label and green dot when done", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "src/components/Card.tsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Creating file: Card.tsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("ToolInvocationBadge renders correctly for file_manager delete", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        toolCallId: "2",
        toolName: "file_manager",
        args: { command: "delete", path: "src/components/OldCard.tsx" },
        state: "result",
        result: "Deleted",
      }}
    />
  );

  expect(screen.getByText("Deleting file: OldCard.tsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

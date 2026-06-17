import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

export function getToolLabel(toolName: string, args: Record<string, unknown>): string {
  const path = typeof args?.path === "string" ? args.path : "";
  const filename = path.split("/").pop() ?? path;

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create":    return `Creating file: ${filename}`;
      case "str_replace":
      case "insert":    return `Editing file: ${filename}`;
      case "view":      return `Viewing file: ${filename}`;
      case "undo_edit": return `Undoing edit: ${filename}`;
      default:          return `Editing file: ${filename}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "rename": {
        const newPath = typeof args?.new_path === "string" ? args.new_path : "";
        const newFilename = newPath.split("/").pop() ?? newPath;
        return `Renaming file: ${filename} → ${newFilename}`;
      }
      case "delete": return `Deleting file: ${filename}`;
      default:       return `Managing file: ${filename}`;
    }
  }

  return toolName;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const isDone = toolInvocation.state === "result" && "result" in toolInvocation && toolInvocation.result;
  const label = getToolLabel(toolInvocation.toolName, toolInvocation.args as Record<string, unknown>);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

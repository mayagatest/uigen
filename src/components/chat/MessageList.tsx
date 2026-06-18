"use client";

import { UIMessage, isToolUIPart } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolInvocationBadge } from "./ToolInvocationBadge";

interface MessageListProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-6">
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-neutral-300" />
                </div>
              </div>
            )}

            <div className={cn(
              "flex flex-col gap-1.5 max-w-[85%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-2xl px-4 py-3",
                message.role === "user"
                  ? "bg-neutral-800 text-neutral-100 border border-neutral-700"
                  : "bg-neutral-900 text-neutral-200 border border-neutral-700/60"
              )}>
                <div className="text-sm leading-relaxed">
                  <>
                    {message.parts.map((part, partIndex) => {
                      if (isToolUIPart(part)) {
                        return (
                          <ToolInvocationBadge
                            key={partIndex}
                            toolPart={part}
                          />
                        );
                      }

                      switch (part.type) {
                        case "text":
                          return message.role === "user" ? (
                            <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>
                          ) : (
                            <MarkdownRenderer
                              key={partIndex}
                              content={part.text}
                              className="prose-sm prose-invert"
                            />
                          );
                        case "reasoning":
                          return (
                            <div key={partIndex} className="mt-3 p-3 bg-neutral-800 rounded-lg border border-neutral-700">
                              <span className="text-xs font-medium text-neutral-400 block mb-1">Reasoning</span>
                              <span className="text-sm text-neutral-400">{part.text}</span>
                            </div>
                          );
                        case "step-start":
                          return partIndex > 0 ? <hr key={partIndex} className="my-3 border-neutral-700" /> : null;
                        default:
                          return null;
                      }
                    })}
                    {isLoading &&
                      message.role === "assistant" &&
                      messages.indexOf(message) === messages.length - 1 && (
                        <div className="flex items-center gap-2 mt-3 text-neutral-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-sm">Generating...</span>
                        </div>
                      )}
                  </>
                </div>
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-700 border border-neutral-600 flex items-center justify-center">
                  <User className="h-4 w-4 text-neutral-300" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

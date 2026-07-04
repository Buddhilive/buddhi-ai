import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText("");
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="relative flex items-end w-full max-w-4xl mx-auto bg-background border rounded-2xl p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Type your simple request here... (e.g. 'Write a blog post about AI')"
        className="flex-1 max-h-[200px] min-h-[44px] bg-transparent border-0 resize-none px-3 py-3 focus:outline-none focus:ring-0 w-full"
        disabled={disabled}
        rows={1}
      />
      <div className="flex items-center gap-2 pl-2">
        <span className="text-xs text-muted-foreground mr-1">
          {text.length}
        </span>
        <Button
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
        >
          {disabled && !text.trim() ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
}

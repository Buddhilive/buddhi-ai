import {
  Sparkles,
  FileText,
  MessageCircleQuestion,
  Tag,
  Code2,
  Brain,
  PenLine,
  Drama,
  type LucideIcon,
} from "lucide-react";

export interface PromptCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  categoryHint: string;
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: "general",
    label: "General",
    icon: Sparkles,
    description: "A versatile, all-purpose prompt",
    categoryHint: "general-purpose task",
  },
  {
    id: "summarize",
    label: "Text Summarization",
    icon: FileText,
    description: "Condense long content into key points",
    categoryHint: "text summarization task",
  },
  {
    id: "qa",
    label: "Question Answering",
    icon: MessageCircleQuestion,
    description: "Get precise answers from a given context",
    categoryHint: "question answering task",
  },
  {
    id: "classify",
    label: "Classification",
    icon: Tag,
    description: "Categorise or label text or data",
    categoryHint: "text classification task",
  },
  {
    id: "code",
    label: "Code Generation",
    icon: Code2,
    description: "Write, explain, or debug code",
    categoryHint: "code generation or debugging task",
  },
  {
    id: "reasoning",
    label: "Reasoning",
    icon: Brain,
    description: "Multi-step logic and problem solving",
    categoryHint: "complex reasoning or problem-solving task",
  },
  {
    id: "creative",
    label: "Creative Writing",
    icon: PenLine,
    description: "Stories, essays, poetry and more",
    categoryHint: "creative writing task",
  },
  {
    id: "roleplay",
    label: "Role Playing",
    icon: Drama,
    description: "Persona-based or scenario-driven prompts",
    categoryHint: "role-play or persona-based task",
  },
];

export interface TargetModel {
  id: "gemini" | "claude" | "gpt";
  label: string;
  badge: string;
  formatGuide: string;
}

export const TARGET_MODELS: TargetModel[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    badge: "Gemini",
    formatGuide:
      "Use clear markdown structure. Leverage Gemini's long context strength. Add role and context sections up front. Prefer structured headings.",
  },
  {
    id: "claude",
    label: "Anthropic Claude",
    badge: "Claude",
    formatGuide:
      "Use XML tags (<instructions>, <context>, <examples>, <output_format>) for structure. Put the core instruction first. Claude responds well to explicit constraints and format specs.",
  },
  {
    id: "gpt",
    label: "OpenAI GPT",
    badge: "GPT",
    formatGuide:
      "Use delimiters (### or ---) to separate sections. Be explicit about the role at the top. GPT follows step-by-step instruction well.",
  },
];

export interface PromptTechnique {
  id: string;
  label: string;
  description: string;
  techniqueHint: string;
}

export const PROMPT_TECHNIQUES: PromptTechnique[] = [
  {
    id: "general",
    label: "General (Auto)",
    description: "Let the AI choose the best approach",
    techniqueHint: "Apply the most appropriate prompting technique for the task.",
  },
  {
    id: "zero-shot",
    label: "Zero-shot",
    description: "Direct instruction, no examples needed",
    techniqueHint:
      "Use zero-shot prompting — give a clear direct instruction without examples.",
  },
  {
    id: "few-shot",
    label: "Few-shot",
    description: "Include 2–3 examples to guide the output",
    techniqueHint:
      "Use few-shot prompting — include 2-3 concise input/output examples to guide the model.",
  },
  {
    id: "cot",
    label: "Chain-of-Thought",
    description: "Ask the model to reason step by step",
    techniqueHint:
      "Use Chain-of-Thought prompting — instruct the model to reason step-by-step before giving the final answer.",
  },
  {
    id: "meta",
    label: "Meta Prompting",
    description: "Ask the model to reflect on how it should respond",
    techniqueHint:
      "Use Meta Prompting — ask the model to first think about how to best approach the task, then respond.",
  },
  {
    id: "react",
    label: "ReAct",
    description: "Combine reasoning with action-taking steps",
    techniqueHint:
      "Use ReAct style — interleave reasoning (Thought) and actions (Act) with observations.",
  },
  {
    id: "tot",
    label: "Tree of Thoughts",
    description: "Explore multiple reasoning paths",
    techniqueHint:
      "Use Tree of Thoughts — explore several different reasoning paths before converging on an answer.",
  },
  {
    id: "knowledge",
    label: "Generate Knowledge",
    description: "Generate background facts before answering",
    techniqueHint:
      "Use Generate Knowledge Prompting — first generate relevant background knowledge, then use it to answer.",
  },
  {
    id: "role",
    label: "Role Prompting",
    description: "Assign a specific expert persona to the AI",
    techniqueHint:
      "Use Role Prompting — assign a specific expert persona or role to the AI at the start of the prompt.",
  },
];

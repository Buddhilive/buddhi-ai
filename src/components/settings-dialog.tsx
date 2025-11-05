"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Settings } from "lucide-react"

export interface SettingsFormData {
  originalTextContext?: string
  summaryContext?: string
  type: "key-points" | "tldr" | "teaser" | "headline"
  format: "markdown" | "plain-text"
  length: "short" | "medium" | "long"
}

interface SettingsDialogProps {
  onSave: (data: SettingsFormData) => void
  defaultValues?: Partial<SettingsFormData>
}

export function SettingsDialog({ onSave, defaultValues }: SettingsDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [formData, setFormData] = React.useState<SettingsFormData>({
    originalTextContext: defaultValues?.originalTextContext || "",
    summaryContext: defaultValues?.summaryContext || "",
    type: defaultValues?.type || "key-points",
    format: defaultValues?.format || "markdown",
    length: defaultValues?.length || "medium",
  })

  const handleSave = () => {
    onSave(formData)
    setOpen(false)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your summarization preferences and context settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Original Text Context */}
          <div className="grid gap-2">
            <label htmlFor="originalTextContext" className="text-sm font-medium">
              Original text context
            </label>
            <Textarea
              id="originalTextContext"
              placeholder="Enter additional context..."
              value={formData.originalTextContext}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  originalTextContext: e.target.value,
                }))
              }
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Additional shared context that can help the summarizer.
            </p>
          </div>

          {/* Summary Context */}
          <div className="grid gap-2">
            <label htmlFor="summaryContext" className="text-sm font-medium">
              Summary Context
            </label>
            <Textarea
              id="summaryContext"
              placeholder="Enter background details..."
              value={formData.summaryContext}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  summaryContext: e.target.value,
                }))
              }
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Background details that might improve the summarization.
            </p>
          </div>

          {/* Select Options */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Type Select */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={formData.type}
                onValueChange={(value: "key-points" | "tldr" | "teaser" | "headline") =>
                  setFormData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="key-points">Key Points</SelectItem>
                  <SelectItem value="tldr">TL;DR</SelectItem>
                  <SelectItem value="teaser">Teaser</SelectItem>
                  <SelectItem value="headline">Headline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Format Select */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Format</label>
              <Select
                value={formData.format}
                onValueChange={(value: "markdown" | "plain-text") =>
                  setFormData(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="plain-text">Plain Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Length Select */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Length</label>
              <Select
                value={formData.length}
                onValueChange={(value: "short" | "medium" | "long") =>
                  setFormData(prev => ({ ...prev, length: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
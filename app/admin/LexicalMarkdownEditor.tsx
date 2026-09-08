"use client"

import { useEffect, useRef } from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown"
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from "@lexical/rich-text"
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode } from "@lexical/list"
import { $setBlocksType } from "@lexical/selection"
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link"
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/extension"
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode"
import {
  $getSelection,
  $isTextNode,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical"
import { Bold, Eraser, Heading1, Heading2, Heading3, Italic, Link, List, ListOrdered, Minus, Quote, Redo2, Strikethrough, Undo2 } from "lucide-react"

interface LexicalMarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const theme = {
  paragraph: "mb-2",
  quote: "border-l-4 border-muted-foreground/30 pl-4 italic",
  heading: {
    h1: "text-3xl font-bold",
    h2: "text-xl font-semibold",
    h3: "text-lg font-semibold",
  },
  list: {
    ul: "list-disc pl-6",
    ol: "list-decimal pl-6",
  },
}

function MarkdownSyncPlugin({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editor] = useLexicalComposerContext()
  const lastValue = useRef(value)

  useEffect(() => {
    if (value === lastValue.current) return
    lastValue.current = value
    editor.update(() => {
      $convertFromMarkdownString(value, TRANSFORMERS)
    }, { tag: "history-merge" })
  }, [editor, value])

  return (
    <OnChangePlugin
      onChange={(editorState) => {
        editorState.read(() => {
          const markdown = $convertToMarkdownString(TRANSFORMERS)
          lastValue.current = markdown
          onChange(markdown)
        })
      }}
      ignoreSelectionChange
    />
  )
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className="rounded p-2 hover:bg-muted">
      {children}
    </button>
  )
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()

  const setBlockType = (type: "h1" | "h2" | "h3" | "quote") => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      $setBlocksType(selection, () => type === "quote" ? $createQuoteNode() : $createHeadingNode(type))
    })
  }

  const addLink = () => {
    const url = window.prompt("Enter the link URL")
    if (url === null) return
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim() || null)
  }

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      for (const node of selection.getNodes()) {
        if ($isTextNode(node)) {
          node.setFormat(0)
          node.setStyle("")
        }
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
      <ToolbarButton label="Bold" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Heading 1" onClick={() => setBlockType("h1")}><Heading1 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Heading 2" onClick={() => setBlockType("h2")}><Heading2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Heading 3" onClick={() => setBlockType("h3")}><Heading3 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Strikethrough" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}><Strikethrough className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Bulleted list" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Numbered list" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Quote" onClick={() => setBlockType("quote")}><Quote className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Insert link" onClick={addLink}><Link className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Horizontal rule" onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}><Minus className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Clear formatting" onClick={clearFormatting}><Eraser className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <ToolbarButton label="Undo" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}><Undo2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}><Redo2 className="h-4 w-4" /></ToolbarButton>
    </div>
  )
}

export function LexicalMarkdownEditor({ value, onChange, placeholder = "" }: LexicalMarkdownEditorProps) {
  const initialConfig = {
    namespace: "EventDescriptionEditor",
    theme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, HorizontalRuleNode],
    onError: (error: Error) => { throw error },
    editorState: () => {
      $convertFromMarkdownString(value, TRANSFORMERS)
    },
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring/50">
        <ToolbarPlugin />
        <RichTextPlugin
          contentEditable={<ContentEditable aria-label="Event description" className="min-h-48 px-4 py-3 outline-none prose prose-neutral dark:prose-invert max-w-none" />}
          placeholder={<div className="pointer-events-none absolute px-4 py-3 text-muted-foreground">{placeholder}</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <MarkdownSyncPlugin value={value} onChange={onChange} />
      </div>
    </LexicalComposer>
  )
}
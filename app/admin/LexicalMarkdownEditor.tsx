"use client"

import { memo, useEffect, useRef, useState } from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { $convertFromMarkdownString, $convertToMarkdownString, LINK, QUOTE, TRANSFORMERS, type ElementTransformer, type TextMatchTransformer } from "@lexical/markdown"
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode, HeadingNode, QuoteNode } from "@lexical/rich-text"
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode, REMOVE_LIST_COMMAND, $isListItemNode, $isListNode } from "@lexical/list"
import { $setBlocksType } from "@lexical/selection"
import { $createLinkNode, $isAutoLinkNode, $isLinkNode, $toggleLink, AutoLinkNode, createLinkMatcherWithRegExp, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link"
import { $createHorizontalRuleNode, $isHorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/extension"
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode"
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin"
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin"
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin"
import {
  $getSelection,
  $getNodeByKey,
  $createTextNode,
  $createParagraphNode,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  FORMAT_TEXT_COMMAND,
  LexicalNode,
  ParagraphNode,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical"
import { Bold, Heading1, Heading2, Heading3, Italic, Link, Link2Off, List, ListOrdered, Minus, Pencil, Quote, Redo2, RemoveFormatting, Strikethrough, Undo2 } from "lucide-react"

interface LexicalMarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const theme = {
  link: "text-blue-600 underline decoration-blue-600/50 underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
  text: {
    strikethrough: "line-through",
  },
  paragraph: "mb-2",
  quote: "border-l-4 border-muted-foreground/30 pl-4 italic",
  heading: {
    h1: "text-3xl font-bold",
    h2: "text-xl font-semibold",
    h3: "text-lg font-semibold",
  },
  list: {
    ul: "list-disc pl-6",
    ol: "list-decimal pl-6 editor-numbered-list",
  },
}

const emailMatcher = createLinkMatcherWithRegExp(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/i, (text) => `mailto:${text}`)
const urlMatcher = createLinkMatcherWithRegExp(/(?:(?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<]*)?)/i, (text) => /^(?:https?:\/\/)/i.test(text) ? text : `https://${text}`)
const OPEN_LINK_EDITOR_COMMAND = createCommand("OPEN_LINK_EDITOR")

const AUTO_LINK_MARKDOWN_TRANSFORMER: TextMatchTransformer = {
  ...LINK,
  export: (node, exportChildren) => {
    if (!$isAutoLinkNode(node)) return null
    return `[${exportChildren(node)}](${node.getURL()})`
  },
}

const HORIZONTAL_RULE_MARKDOWN_TRANSFORMER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => $isHorizontalRuleNode(node) ? "---" : null,
  regExp: /^---\s*$/,
  replace: (parentNode, _children, _match, isImport) => {
    if (!isImport) return false
    parentNode.replace($createHorizontalRuleNode())
    return true
  },
  type: "element",
}

const BLANK_QUOTE_MARKDOWN_TRANSFORMER: ElementTransformer = {
  dependencies: [QuoteNode],
  export: (node) => $isQuoteNode(node) && node.getChildrenSize() === 0 ? "> <!--lexical-blank-quote-->" : null,
  regExp: /^>\s*<!--lexical-blank-quote-->\s*$/,
  replace: (parentNode, _children, _match, isImport) => {
    if (!isImport) return false
    parentNode.replace($createQuoteNode())
    return true
  },
  type: "element",
}

const LITERAL_GREATER_THAN_MARKDOWN_TRANSFORMER: ElementTransformer = {
  dependencies: [ParagraphNode],
  export: (node) => $isParagraphNode(node) && node.getTextContent() === ">" ? "<!--lexical-literal-greater-than-->" : null,
  regExp: /^<!--lexical-literal-greater-than-->\s*$/,
  replace: (parentNode, children, _match, isImport) => {
    if (!isImport) return false
    parentNode.replace($createParagraphNode().append($createTextNode(">")))
    return true
  },
  type: "element",
}

const MARKDOWN_TRANSFORMERS = [
  HORIZONTAL_RULE_MARKDOWN_TRANSFORMER,
  BLANK_QUOTE_MARKDOWN_TRANSFORMER,
  LITERAL_GREATER_THAN_MARKDOWN_TRANSFORMER,
  ...TRANSFORMERS.filter((transformer) => transformer !== LINK && transformer !== QUOTE),
  QUOTE,
  AUTO_LINK_MARKDOWN_TRANSFORMER,
  LINK,
]

function normalizeLinkUrl(url: string) {
  const trimmedUrl = url.trim()
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`
}

function LinkEditorPlugin() {
  const [editor] = useLexicalComposerContext()
  const [link, setLink] = useState<{ key: string; url: string; text: string; top: number; left: number } | null>(null)
  const [draftUrl, setDraftUrl] = useState("")
  const [draftText, setDraftText] = useState("")

  useEffect(() => {
    const root = editor.getRootElement()
    if (!root) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element) || !target.closest("a")) {
        setLink(null)
        return
      }
      const anchor = target.closest("a")
      if (!anchor) return
      event.preventDefault()
      let linkKey: string | null = null
      let url = anchor.getAttribute("href") ?? ""
      editor.getEditorState().read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return
        let node: LexicalNode | null = selection.anchor.getNode()
        while (node && !$isLinkNode(node)) {
          node = node.getParent()
        }
        if ($isLinkNode(node)) {
          linkKey = node.getKey()
          url = node.getURL()
        }
      })
      if (!linkKey) return
      const rect = anchor.getBoundingClientRect()
      const shell = root.closest<HTMLElement>("[data-editor-shell]")
      if (!shell) return
      const shellRect = shell.getBoundingClientRect()
      const text = editor.getEditorState().read(() => {
        const node = linkKey ? $getNodeByKey(linkKey) : null
        return node?.getTextContent() ?? ""
      })
      const popupHeight = 190
      const spaceBelow = shellRect.bottom - rect.bottom
      const top = spaceBelow < popupHeight + 12
        ? rect.top - shellRect.top - popupHeight - 6
        : rect.bottom - shellRect.top + 6
      setLink({
        key: linkKey,
        url,
        text,
        top: Math.max(8, top),
        left: Math.max(8, rect.left - shellRect.left),
      })
      setDraftUrl(url)
      setDraftText(text)
    }

    root.addEventListener("click", handleClick)
    return () => root.removeEventListener("click", handleClick)
  }, [editor])

  useEffect(() => editor.registerCommand(
    OPEN_LINK_EDITOR_COMMAND,
    () => {
      let linkKey: string | null = null
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection) || selection.isCollapsed()) return
        const selectedText = selection.getTextContent()
        if (!selectedText.trim()) return
        $toggleLink("https://")
        const linkNode = selection.getNodes().map((node) => {
          let current: LexicalNode | null = node
          while (current && !$isLinkNode(current)) current = current.getParent()
          return current
        }).find((node): node is LinkNode => $isLinkNode(node))
        linkKey = linkNode?.getKey() ?? null
      })
      requestAnimationFrame(() => {
        if (!linkKey) return
        const element = editor.getElementByKey(linkKey)
        const root = editor.getRootElement()
        const shell = root?.closest<HTMLElement>("[data-editor-shell]")
        if (!element || !root || !shell) return
        const rect = element.getBoundingClientRect()
        const shellRect = shell.getBoundingClientRect()
        const text = editor.getEditorState().read(() => $getNodeByKey(linkKey!)?.getTextContent() ?? "")
        const popupHeight = 190
        const top = shellRect.bottom - rect.bottom < popupHeight + 12
          ? rect.top - shellRect.top - popupHeight - 6
          : rect.bottom - shellRect.top + 6
        setLink({ key: linkKey, url: "https://", text, top: Math.max(8, top), left: Math.max(8, rect.left - shellRect.left) })
        setDraftUrl("https://")
        setDraftText(text)
      })
      return true
    },
    COMMAND_PRIORITY_EDITOR,
  ), [editor])

  if (!link) return null

  const saveLink = () => {
    if (!draftUrl.trim() || !draftText.trim()) return
    editor.update(() => {
      const node = $getNodeByKey(link.key)
      if (!$isLinkNode(node)) return
      let editableNode: LinkNode = node
      if ($isAutoLinkNode(node)) {
        editableNode = $createLinkNode(normalizeLinkUrl(draftUrl))
        for (const child of node.getChildren()) editableNode.append(child)
        node.replace(editableNode)
      } else {
        editableNode.setURL(normalizeLinkUrl(draftUrl))
      }
      const children = editableNode.getChildren()
      if (children.length > 0) {
        const textNode = $createTextNode(draftText.trim())
        if ($isTextNode(children[0])) children[0].setTextContent(draftText.trim())
        else children[0].replace(textNode)
        for (const child of children.slice(1)) child.remove()
      } else {
        editableNode.append($createTextNode(draftText.trim()))
      }
    })
    setLink(null)
  }

  const removeLink = () => {
    editor.update(() => {
      const node = $getNodeByKey(link.key)
      if (!$isLinkNode(node)) return
      if (!node.getParent()) return
      for (const child of node.getChildren()) {
        if ($isTextNode(child)) {
          child.setFormat(0)
          child.setStyle("")
        }
        node.insertBefore(child)
      }
      node.remove()
    })
    setLink(null)
  }

  return (
    <div className="absolute z-50 w-72 rounded-lg border border-border bg-background p-3 shadow-lg" style={{ top: link.top, left: link.left }} onClick={(event) => event.stopPropagation()}>
      <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="link-url">URL</label>
      <input id="link-url" value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} onKeyDown={(event) => event.stopPropagation()} className="mb-3 w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
      <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="link-text">Preview text</label>
      <input id="link-text" value={draftText} onChange={(event) => setDraftText(event.target.value)} onKeyDown={(event) => event.stopPropagation()} className="mb-3 w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <button type="button" title="Remove hyperlink" aria-label="Remove hyperlink" onClick={removeLink} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Link2Off className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-2">
        <button type="button" onClick={() => setLink(null)} className="rounded px-2 py-1 text-sm hover:bg-muted">Cancel</button>
        <button type="button" onClick={saveLink} className="rounded bg-primary px-2 py-1 text-sm text-primary-foreground hover:bg-primary/90"><Pencil className="mr-1 inline h-3 w-3" />Save</button>
        </div>
      </div>
    </div>
  )
}

function MarkdownSyncPlugin({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editor] = useLexicalComposerContext()
  const lastValue = useRef(value)

  useEffect(() => {
    if (value === lastValue.current) return
    lastValue.current = value
    editor.update(() => {
      $convertFromMarkdownString(value, MARKDOWN_TRANSFORMERS)
    }, { tag: "history-merge" })
  }, [editor, value])

  return (
    <OnChangePlugin
      onChange={(editorState) => {
        editorState.read(() => {
          const markdown = $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
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
  active = false,
  onClick,
  onMouseDown,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={onMouseDown ?? ((event) => event.preventDefault())}
      onClick={onClick}
      className={`rounded p-2 hover:bg-muted ${active ? "bg-muted text-foreground" : ""}`}
    >
      {children}
    </button>
  )
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    strikethrough: false,
    h1: false,
    h2: false,
    h3: false,
    bullet: false,
    number: false,
    quote: false,
    link: false,
  })

  useEffect(() => editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) {
        setActiveFormats((current) => ({ ...current, bold: false, italic: false, strikethrough: false, h1: false, h2: false, h3: false, bullet: false, number: false, quote: false, link: false }))
        return
      }

      const block = selection.getNodes()[0]?.getTopLevelElement()
      const link = selection.getNodes().some((node) => {
        let current: LexicalNode | null = node
        while (current) {
          if ($isLinkNode(current)) return true
          current = current.getParent()
        }
        return false
      })
      const list = block && $isListNode(block) ? block.getListType() : null

      setActiveFormats({
        bold: selection.hasFormat("bold"),
        italic: selection.hasFormat("italic"),
        strikethrough: selection.hasFormat("strikethrough"),
        h1: !!block && $isHeadingNode(block) && block.getTag() === "h1",
        h2: !!block && $isHeadingNode(block) && block.getTag() === "h2",
        h3: !!block && $isHeadingNode(block) && block.getTag() === "h3",
        bullet: list === "bullet",
        number: list === "number",
        quote: !!block && $isQuoteNode(block),
        link,
      })
    })
  }), [editor])

  const toggleBold = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
  }

  const setBlockType = (type: "h1" | "h2" | "h3" | "quote") => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const block = selection.getNodes()[0]?.getTopLevelElementOrThrow()
      const isActive = type === "quote"
        ? $isQuoteNode(block)
        : $isHeadingNode(block) && block.getTag() === type
      $setBlocksType(selection, () => isActive ? $createParagraphNode() : type === "quote" ? $createQuoteNode() : $createHeadingNode(type))
    })
  }

  const toggleList = (listType: "bullet" | "number") => {
    let isActive = false
    const headingSizes = new Map<string, string>()
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const block = selection.getNodes()[0]?.getTopLevelElementOrThrow()
      isActive = $isListNode(block) && block.getListType() === listType
      for (const node of selection.getNodes()) {
        const topLevel = node.getTopLevelElementOrThrow()
        if ($isHeadingNode(topLevel)) {
          const size = topLevel.getTag() === "h1" ? "1.875rem" : topLevel.getTag() === "h2" ? "1.25rem" : "1.125rem"
          headingSizes.set(topLevel.getTextContent(), size)
        }
      }
    })
    if (isActive) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      return
    }
    if (headingSizes.size > 0) {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createParagraphNode())
      })
    }
    editor.dispatchCommand(listType === "bullet" ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)
    if (headingSizes.size > 0) {
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return
        for (const node of selection.getNodes()) {
          let current: LexicalNode | null = node
          while (current && !$isListItemNode(current)) current = current.getParent()
          if (!$isListItemNode(current)) continue
          const size = headingSizes.get(current.getTextContent())
          if (size) current.setStyle(`font-size: ${size}`)
        }
      })
    }
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
        const parent = node.getParent()
        if ($isElementNode(parent)) {
          parent.setFormat("")
          parent.setStyle("")
        }
      }
      selection.format = 0
      $setBlocksType(selection, () => $createParagraphNode())
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
      <ToolbarButton label="Bold" active={activeFormats.bold} onClick={toggleBold}><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Italic" active={activeFormats.italic} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Heading 1" active={activeFormats.h1} onClick={() => setBlockType("h1")}><Heading1 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Heading 2" active={activeFormats.h2} onClick={() => setBlockType("h2")}><Heading2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Heading 3" active={activeFormats.h3} onClick={() => setBlockType("h3")}><Heading3 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Strikethrough" active={activeFormats.strikethrough} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}><Strikethrough className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Bulleted list" active={activeFormats.bullet} onClick={() => toggleList("bullet")}><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Numbered list" active={activeFormats.number} onClick={() => toggleList("number")}><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Quote" active={activeFormats.quote} onClick={() => setBlockType("quote")}><Quote className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Add link" active={activeFormats.link} onMouseDown={(event) => event.preventDefault()} onClick={() => editor.dispatchCommand(OPEN_LINK_EDITOR_COMMAND, undefined)}><Link className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Horizontal rule" onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}><Minus className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Clear formatting" onClick={clearFormatting}><RemoveFormatting className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <ToolbarButton label="Undo" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}><Undo2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}><Redo2 className="h-4 w-4" /></ToolbarButton>
    </div>
  )
}

export const LexicalMarkdownEditor = memo(function LexicalMarkdownEditor({ value, onChange, placeholder = "" }: LexicalMarkdownEditorProps) {
  const initialConfig = useRef({
    namespace: "EventDescriptionEditor",
    theme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, HorizontalRuleNode],
    onError: (error: Error) => { throw error },
    editorState: () => {
      $convertFromMarkdownString(value, MARKDOWN_TRANSFORMERS)
    },
  }).current

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div data-editor-shell className="relative rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring/50">
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={<ContentEditable aria-label="Event description" className="min-h-48 px-4 py-3 outline-none prose prose-neutral dark:prose-invert max-w-none" />}
            placeholder={<div className="pointer-events-none absolute left-0 top-0 px-4 py-3 text-muted-foreground">{placeholder}</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <HorizontalRulePlugin />
        <LinkPlugin />
        <AutoLinkPlugin matchers={[emailMatcher, urlMatcher]} />
        <LinkEditorPlugin />
        <MarkdownSyncPlugin value={value} onChange={onChange} />
      </div>
    </LexicalComposer>
  )
})
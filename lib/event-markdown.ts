import { type ElementTransformer } from "@lexical/markdown"
import { $createParagraphNode, $createTextNode, $isParagraphNode, ParagraphNode } from "lexical"

// Markdown normally discards empty paragraphs. Keep a marker so event spacing
// survives saving and reopening without changing how older Markdown is read.
export const BLANK_PARAGRAPH_MARKER = "<!--lexical-blank-paragraph-->"

export const BLANK_PARAGRAPH_MARKDOWN_TRANSFORMER: ElementTransformer = {
  dependencies: [ParagraphNode],
  export: (node) => $isParagraphNode(node) && (node.getChildrenSize() === 0 || node.getTextContent() === "\u200B")
    ? `\n${BLANK_PARAGRAPH_MARKER}\n`
    : null,
  regExp: /^<!--lexical-blank-paragraph-->\s*$/,
  replace: (parentNode, _children, _match, isImport) => {
    if (!isImport) return false
    // A zero-width placeholder keeps Markdown import from removing the blank
    // paragraph and gives it the same line height on the published page.
    parentNode.replace($createParagraphNode().append($createTextNode("\u200B")))
    return true
  },
  type: "element",
}

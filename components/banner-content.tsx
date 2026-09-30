import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { BannerContent as Content } from '@/lib/banner'

export function BannerContent({ content }: { content: Content }) {
  return (
    <div
      className="announcement-content break-words px-4 py-3 text-center text-sm sm:text-base"
      style={{ backgroundColor: content.backgroundColor, color: content.textColor }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>
        {content.markdown}
      </ReactMarkdown>
    </div>
  )
}

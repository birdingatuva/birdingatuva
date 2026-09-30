export interface BannerContent {
  markdown: string
  backgroundColor: string
  textColor: string
}

export const defaultBannerContent: BannerContent = {
  markdown: '',
  backgroundColor: '#fef3c7',
  textColor: '#78350f',
}

export function isBannerContent(value: unknown): value is BannerContent {
  if (!value || typeof value !== 'object') return false
  const content = value as BannerContent
  return typeof content.markdown === 'string' && content.markdown.length <= 10000 &&
    typeof content.backgroundColor === 'string' && /^#[0-9a-f]{6}$/i.test(content.backgroundColor) &&
    typeof content.textColor === 'string' && /^#[0-9a-f]{6}$/i.test(content.textColor)
}

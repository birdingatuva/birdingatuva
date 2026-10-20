export function buildSmsUrl(platform: 'iphone' | 'android', phones: string[], text: string): string {
  const addresses = [...new Set(phones)].filter(phone => /^\+[1-9]\d{7,14}$/.test(phone)).map(encodeURIComponent).join(',')
  const body = encodeURIComponent(text)
  return platform === 'iphone'
    ? `sms:/open?addresses=${addresses}&body=${body}`
    : `sms:${addresses}?body=${body}`
}

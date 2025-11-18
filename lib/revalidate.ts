import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Revalidates event-related pages on-demand.
 * This should be called only when the database is updated through the admin form
 * (creating, editing, or deleting an event).
 * 
 * This minimizes ISR usage by avoiding time-based revalidation.
 */
export function revalidateEvents(slug?: string) {
  try {
    // Always revalidate the events list page
    revalidatePath('/events', 'page')
    
    // If a specific slug is provided, revalidate that event's page
    if (slug) {
      revalidatePath(`/events/${slug}`, 'page')
    }
    
    // Optionally revalidate the home page if it displays event data
    // revalidatePath('/', 'page')
    
    console.log(`✅ Revalidated event pages${slug ? ` for slug: ${slug}` : ''}`)
    return true
  } catch (error) {
    console.error('❌ Revalidation failed:', error)
    return false
  }
}

/**
 * Revalidates multiple event slugs at once.
 * Useful when bulk operations affect multiple events.
 */
export function revalidateMultipleEvents(slugs: string[]) {
  try {
    // Always revalidate the events list page
    revalidatePath('/events', 'page')
    
    // Revalidate each specific event page
    slugs.forEach(slug => {
      if (slug) {
        revalidatePath(`/events/${slug}`, 'page')
      }
    })
    
    console.log(`✅ Revalidated event pages for ${slugs.length} slug(s)`)
    return true
  } catch (error) {
    console.error('❌ Bulk revalidation failed:', error)
    return false
  }
}

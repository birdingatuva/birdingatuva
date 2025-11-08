export const events = [
  {
    slug: "ohill-birding",
    title: "Ohill Birding",
    // ISO date strings for precise logic and future DB compatibility
    startDate: "2025-11-07",
    endDate: "2025-11-07",
    // store times in 24-hour HH:mm format for consistency
    startTime: "07:00",
    endTime: "09:15",
    location: "Meeting at Slaughter",
    image: "/images/local-trips/ohill.png",
    url: "/events/ohill-birding",
    bodyMarkdown: `
Hello everyone! It was great seeing some of you at the interest meeting on Wednesday night! If you didn't get a chance to come, stop by on Tuesday in New Cabell 232. Before then, though, we wanted to do some group birding!!

We will meet at 7:00 at the Slaughter Recreation Center and leave around 7:05 to start our bird walk. We should be back at the slaughter around 9:15.

On the walk, you can expect to see mostly resident species, which will allow new birders to learn about the species they are likely to encounter, and will give experienced birders a chance to brush up on some ID skills. This is a low-intensity trip, so we hope that everyone who can will attend.

**Here are some recommendations of pre-trip actions:**

- **Fill out the attendance form below** (this is required)
- Download the **Merlin bird ID app** on your phone, as well as the Virginia bird pack
- Bring a full water bottle
- Grab some binoculars, if you have them (if not, they're definitely not needed)
- Wear warm clothes!! It's gonna be a chilly 42 degrees, so be sure to dress for the weather

Hope to see you all there! If you have any questions, comments, or concerns, send a message on the GroupMe, DM one of the Execs, or send an email to **birdingatuva@gmail.com**
`,
    signupTitle: "Sign Up",
    signupUrl: "https://docs.google.com/forms/d/e/1FAIpQLScb7WsWg5hrHRK5OwsLxtzQ4B9BXD3kh-8y1P9BiS6zKx4JQg/viewform?usp=dialog",
    signupEmbedUrl: "https://docs.google.com/forms/d/e/1FAIpQLScb7WsWg5hrHRK5OwsLxtzQ4B9BXD3kh-8y1P9BiS6zKx4JQg/viewform?usp=dialog",
  }, 

].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

export function getEventBySlug(slug: string) {
  return events.find((e) => e.slug === slug) ?? null
}

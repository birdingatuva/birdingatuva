import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DecorativeBirds } from "@/components/decorative-birds";
import { PageHeader } from "@/components/page-header";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Clock } from "lucide-react";
import { getEventBySlug } from "../events-data";
import { formatDisplayDate, formatTimeForDisplay } from "../date-utils";
import EventTemplate from "../EventTemplate";

const slug = "ohill-birding"
const event = getEventBySlug(slug)

const bodyMarkdown = `
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
`;

export default function OhillBirdingEvent() {
  if (!event) return null;
  return (
    <EventTemplate
      title={event.title}
      description={`${formatDisplayDate(event.startDate, event.endDate)} | ${formatTimeForDisplay(event.startDate, event.startTime)} - ${formatTimeForDisplay(event.startDate, event.endTime)} | ${event.location}`}
      image={event.image}
      location={event.location}
      dateDisplay={formatDisplayDate(event.startDate, event.endDate)}
      timeDisplay={`${formatTimeForDisplay(event.startDate, event.startTime)} - ${formatTimeForDisplay(event.startDate, event.endTime)}`}
      bodyMarkdown={bodyMarkdown}
      signupTitle="Sign Up"
      signupUrl="https://docs.google.com/forms/d/e/1FAIpQLScb7WsWg5hrHRK5OwsLxtzQ4B9BXD3kh-8y1P9BiS6zKx4JQg/viewform?usp=dialog"
      signupEmbedUrl="https://docs.google.com/forms/d/e/1FAIpQLScb7WsWg5hrHRK5OwsLxtzQ4B9BXD3kh-8y1P9BiS6zKx4JQg/viewform?usp=dialog"
    />
  );
}

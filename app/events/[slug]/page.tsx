import { notFound } from "next/navigation";
import { getEventBySlug } from "../events-data";
import EventTemplate from "../EventTemplate";

export default function EventPage({ params }: { params: { slug: string } }) {
  const event = getEventBySlug(params.slug);
  if (!event) return notFound();

  const bodyMarkdown = event.bodyMarkdown || "Event details coming soon.";
  const signupUrl = event.signupUrl || "";
  const signupEmbedUrl = event.signupEmbedUrl || "";

  return (
    <EventTemplate
      title={event.title}
      description={`${event.startDate}${event.endDate ? ` - ${event.endDate}` : ""} | ${event.startTime} - ${event.endTime} | ${event.location}`}
      image={event.image}
      location={event.location}
      dateDisplay={event.startDate}
      timeDisplay={`${event.startTime} - ${event.endTime}`}
      bodyMarkdown={bodyMarkdown}
      
      signupUrl={signupUrl}
      signupEmbedUrl={signupEmbedUrl}
    />
  );
}

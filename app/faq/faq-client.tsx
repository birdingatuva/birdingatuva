"use client"

import { useState } from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

const faqCategories = [
  {
    category: "Getting Started",
    faqs: [
      {
        question: "How do I join the club?",
        answer:
          "Simply attend one of our meetings or trips! Semester dues are $10, which you can pay with cash or Venmo at or before your first trip. Follow us on Instagram or join our GroupMe (links on the home page) for event announcements and trip details.",
      },
      {
        question: "Is there a membership fee?",
        answer:
          "Yes, semester dues are $10, which you can pay with cash or Venmo at or before your first trip. Your dues cover gas reimbursement for drivers on local trips, so everyone can participate. Additional fees may apply for longer-distance trips to cover transportation costs.",
      },
      {
        question: "Do I need birding knowledge to join?",
        answer:
          "Not at all! We welcome birders of all experience levels, from complete beginners to seasoned experts. Our trips and meetings are designed to be inclusive and educational for everyone.",
      },
      {
        question: "Do I need binoculars?",
        answer:
          "While having your own binoculars is helpful, we have a few pairs available to borrow during trips for beginners who are just getting started. Even without binoculars, you can bird using the Merlin Bird ID app, which has photo and audio recognition features to help identify birds!",
      },
      {
        question: "What should I bring on a birding trip?",
        answer:
          "Bring binoculars (if you have them), a field guide (optional, we'll help with ID), water, comfortable walking shoes, and weather-appropriate clothing. We highly recommend downloading the Merlin Bird ID app and eBird app - both have great record-keeping features where you can track what birds you see!",
      },
      {
        question: "Who can join?",
        answer:
          "Anyone from the UVA community! We welcome undergrads, grad students, faculty, and staff. If you're interested in birds, you're welcome to join us.",
      },
    ],
  },
  {
    category: "Meetings & Events",
    faqs: [
      {
        question: "When and where do you meet?",
        answer:
          "We hold two meetings each month, with one social event and one educational meeting. Meeting times and locations are announced on our Instagram, GroupMe, and email list. Most meetings are held on Grounds in convenient locations for students.",
      },
      {
        question: "What happens at meetings or socials?",
        answer:
          "Our educational meetings include bird identification workshops and discussions about conservation efforts and citizen science projects. Socials are more relaxed with fun activities like bird games or quizzes, movies, and more!",
      },
      {
        question: "How often do you go on birding trips?",
        answer:
          "We organize birding trips weekly to bi-weekly, depending on the season and interest. Trips include short walks on Grounds, local drives to nearby parks, and further trips to destinations like Shenandoah National Park or shorebird areas.",
      },
      {
        question: "Can I suggest a birding location?",
        answer:
          "Absolutely! We love discovering new birding spots. Share your suggestions at any meeting or reach out to our leadership team. If you know a great location, we'd love to plan a trip there!",
      },
    ],
  },
  {
    category: "Birding Trips",
    faqs: [
      {
        question: "How long are typical trips?",
        answer:
          "Most local trips last 2-3 hours, which works well with a student schedule. Longer trips to Shenandoah or other destinations might be half-day or full-day excursions on weekends.",
      },
      {
        question: "Do I need a car to participate?",
        answer:
          "Nope! For local trips (typically 15-20 minutes away), we coordinate carpools. If you do have a car and can drive, your club dues cover the cost of gas for local trips, so you'll be reimbursed. Everyone is welcome to join trips whether or not they have a car!",
      },
      {
        question: "What if I can't identify birds?",
        answer:
          "Don't worry about it! We all started somewhere, and there are always experienced members around to help. We'll point out field marks, listen to calls, and watch behavior. Figuring out what bird you're looking at is half the fun!",
      },
      {
        question: "Will I get back in time for classes?",
        answer:
          "Yes! Local morning trips are scheduled so that most students can return to Grounds in time for their classes. If there's interest, we can also organize alternative trips at non-morning times to accommodate different schedules.",
      },
    ],
  },
  {
    category: "About the Club",
    faqs: [
      {
        question: "Do you participate in citizen science?",
        answer:
          "Yes! We contribute to projects like eBird, the Great Backyard Bird Count, and Christmas Bird Counts. These efforts help scientists track bird populations and migration patterns.",
      },
      {
        question: "How do I share my eBird observations with the club account?",
        answer:
          "After you've finished birding and submitted your checklist, click \"Add Observers\" on your checklist. When given the option to share, add \"Birding@UVA\" as a collaborator. After your checklist has been accepted, you will see it on the club eBird profile!",
      },
    ],
  },
]

interface FAQClientProps {
  birdImages: string[]
}

export function FAQClient({ birdImages }: FAQClientProps) {
  const [openIndex, setOpenIndex] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const toggleAccordion = (categoryIndex: number, faqIndex: number) => {
    const key = `${categoryIndex}-${faqIndex}`
    setOpenIndex(openIndex === key ? null : key)
  }

  const scrollToCategory = (category: string) => {
    setActiveCategory(category)
    const element = document.getElementById(category)
    element?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Filter FAQs based on search query
  const filteredCategories = faqCategories
    .map((cat) => ({
      ...cat,
      faqs: cat.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.faqs.length > 0)

  return (
    <div className="min-h-screen relative">
      <Navigation />

      <main className="relative z-20">
        <DecorativeBirds images={birdImages} />
        <PageHeader 
          title="FAQ"
          description="Everything you need to know about Birding at UVA"
        />

        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl relative z-20">
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Sticky Table of Contents Sidebar */}
              <aside className="lg:col-span-1">
                <div className="lg:sticky lg:top-24 space-y-6">
                  <div>
                    <h3 className="font-display text-xl mb-4 text-primary">QUICK NAVIGATION</h3>
                    <nav className="space-y-2">
                      {faqCategories.map((cat) => (
                        <button
                          key={cat.category}
                          onClick={() => scrollToCategory(cat.category)}
                          className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            activeCategory === cat.category
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          {cat.category}
                        </button>
                      ))}
                    </nav>
                  </div>

                  <div className="hidden lg:block">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Still Have Questions?</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 -mt-2">
                          Can't find what you're looking for? Reach out to us!
                        </p>
                        <Button asChild className="w-full">
                          <Link href="mailto:birdingatuva@gmail.com">Contact Us</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </aside>

              {/* Main FAQ Content */}
              <div className="lg:col-span-3 space-y-8">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-800 shadow-sm"
                  />
                </div>

                {filteredCategories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        No results found for "{searchQuery}". Try a different search term or{" "}
                        <button
                          onClick={() => setSearchQuery("")}
                          className="text-primary hover:underline"
                        >
                          clear your search
                        </button>
                        .
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredCategories.map((category, catIndex) => (
                    <div key={category.category} id={category.category}>
                      <h2 className="font-display text-3xl mb-6 text-primary">
                        {category.category}
                      </h2>
                      <div className="space-y-4">
                        {category.faqs.map((faq, faqIndex) => {
                          const isOpen = openIndex === `${catIndex}-${faqIndex}`
                          return (
                            <Card key={faqIndex} className="overflow-hidden">
                              <button
                                onClick={() => toggleAccordion(catIndex, faqIndex)}
                                className="w-full text-left p-6 flex items-start justify-between gap-4 hover:bg-muted/50 transition-colors"
                              >
                                <h3 className="font-semibold text-lg pr-4">{faq.question}</h3>
                                <ChevronDown
                                  className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 mt-1 ${
                                    isOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                              {isOpen && (
                                <div className="px-6 pb-6 pt-0">
                                  <p className="text-muted-foreground leading-relaxed">
                                    {faq.answer}
                                  </p>
                                </div>
                              )}
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}

                {/* Mobile Contact Card */}
                <div className="lg:hidden">
                  <Card>
                    <CardHeader>
                      <CardTitle>Still Have Questions?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 -mt-2">
                        Can't find what you're looking for? Reach out to us!
                      </p>
                      <Button asChild className="w-full">
                        <Link href="mailto:birdingatuva@gmail.com">Contact Us</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
  <section className="relative z-30 py-15 px-4 bg-gradient-to-br from-[#1e3a5f] via-[#2c5f7a] to-[#3d8b96] text-white">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="font-display text-6xl md:text-7xl font-bold mb-4">{title}</h1>
        {description && <p className="text-xl text-white/90">{description}</p>}
      </div>
    </section>
  )
}

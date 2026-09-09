export function Footer() {
  return (
    <footer
      className="bg-primary text-primary-foreground py-4 w-full"
      style={{ zIndex: 100, position: 'relative', background: 'var(--primary)' }}
    >
      <div className="container mx-auto px-4 text-center relative z-30">
        <p className="text-sm">
          Created by Brian Alewine{" "}
          <a href="mailto:balewine@virginia.edu" className="underline hover:text-secondary transition-colors">
            balewine@virginia.edu
          </a>
        </p>
        <p className="text-xs mt-4 max-w-4xl mx-auto">
          Although this organization has members who are University of Virginia students and may have University employees associated or engaged in its activities and affairs, the organization is not a part of or an agency of the University. It is a separate and independent organization, which is responsible for and manages its own activities and affairs. The University does not direct, supervise or control the organization and is not responsible for the organization's contracts, acts or omissions.
        </p>
      </div>
    </footer>
  )
}

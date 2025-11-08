"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { CloudinaryImage } from "./cloudinary-image"
import { X, ChevronLeft, ChevronRight, Images, Maximize2 } from "lucide-react"
import { Button } from "./ui/button"
import "../styles/image-gallery-custom.css"

interface ImageGalleryProps {
  images: string[]
  title: string
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right'>('right')

  useEffect(() => {
    setMounted(true)
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
    setIsOpen(true)
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setSelectedIndex(null)
    setIsOpen(false)
    document.body.style.overflow = 'unset'
  }

  const goToPrevious = () => {
    if (selectedIndex !== null) {
      setDirection('left')
      setSelectedIndex((selectedIndex - 1 + images.length) % images.length)
    }
  }

  const goToNext = () => {
    if (selectedIndex !== null) {
      setDirection('right')
      setSelectedIndex((selectedIndex + 1) % images.length)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') goToPrevious()
    if (e.key === 'ArrowRight') goToNext()
  }

  return (
    <>
      {/* Single Preview Tile */}
      {images && images.length > 0 && (
        <button
          onClick={() => openLightbox(0)}
          className="group relative w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-all duration-300 hover:ring-2 hover:ring-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open gallery for ${title}`}
        >
          {/* Preview image */}
          <div className="relative h-56 w-full sm:h-72 md:h-80">
            <CloudinaryImage
              src={images[0]}
              alt={`${title} - Gallery preview`}
              fill
              className="object-cover"
            />
          </div>

          {/* Subtle gradient and call-to-action */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-white drop-shadow">
              <div className="rounded-lg bg-black/40 p-2 backdrop-blur-sm">
                <Images className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium sm:text-base">View gallery</p>
                <p className="text-xs text-white/80">{images.length} photo{images.length === 1 ? '' : 's'}</p>
              </div>
            </div>

            <div className="pointer-events-none rounded-full bg-white/90 p-2 text-foreground shadow-lg transition-transform duration-300 group-hover:scale-105">
              <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </button>
      )}

      {/* Lightbox Modal */}
      {mounted && isOpen && selectedIndex !== null && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeLightbox()
          }}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} image gallery`}
        >
          {/* Main floating window - refined design */}
          <div
            className="relative bg-card rounded-xl shadow-xl overflow-hidden max-w-5xl w-full border border-border transition-opacity"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ maxHeight: '85vh' }}
          >
            {/* Top Bar - refined with better hierarchy */}
            <div className="relative bg-background border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="font-display text-lg md:text-xl font-bold text-foreground truncate max-w-xs md:max-w-md">
                  {title}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium bg-muted/70 px-2.5 py-1 rounded-md">
                  {selectedIndex + 1} / {images.length}
                </div>
              </div>
              <Button
                onClick={closeLightbox}
                variant="ghost"
                size="icon"
                className="gallery-modal-btn h-9 w-9 rounded-full bg-background/90 shadow-lg border border-border transition-all duration-200 hover:scale-110"
                aria-label="Close gallery"
              >
                <X className="h-5 w-5 text-foreground" />
              </Button>
            </div>

            {/* Image area - reduced height */}
            <div className="relative w-full bg-muted/30 overflow-hidden" style={{ height: 'min(65vh, 700px)' }}>
              <div 
                key={selectedIndex}
                className={`absolute inset-0 transition-all duration-300 ease-out ${
                  direction === 'right' 
                    ? 'animate-in fade-in slide-in-from-right-8' 
                    : 'animate-in fade-in slide-in-from-left-8'
                }`}
              >
                <CloudinaryImage
                  src={images[selectedIndex]}
                  alt={`${title} - Image ${selectedIndex + 1}`}
                  fill
                  className="object-contain"
                />
              </div>
              
              {/* Click regions for prev/next - smaller width to avoid large hover gradient */}
              {images.length > 1 && (
                <>
                  <div
                    className="absolute inset-y-0 left-0 w-20 cursor-w-resize"
                    onClick={(e) => {
                      e.stopPropagation()
                      goToPrevious()
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute inset-y-0 right-0 w-20 cursor-e-resize"
                    onClick={(e) => {
                      e.stopPropagation()
                      goToNext()
                    }}
                    aria-hidden="true"
                  />
                </>
              )}

              {/* Arrow buttons - matching admin form style */}
              {images.length > 1 && (
                <>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      goToPrevious()
                    }}
                    variant="ghost"
                    size="icon"
                    className="gallery-modal-btn absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 shadow-lg border border-border transition-all duration-200 hover:scale-110"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5 text-foreground" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      goToNext()
                    }}
                    variant="ghost"
                    size="icon"
                    className="gallery-modal-btn absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 shadow-lg border border-border transition-all duration-200 hover:scale-110"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5 text-foreground" />
                  </Button>
                </>
              )}
            </div>

            {/* Bottom thumbnails - smaller size to prevent scrollbar */}
            {images.length > 1 && (
              <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-t border-border px-4 py-3">
                <div className="flex gap-2.5 justify-center overflow-x-auto overflow-y-visible max-w-full py-1">
                  {images.map((imageId, index) => (
                    <button
                      key={imageId}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedIndex(index)
                      }}
                      className={`relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                        index === selectedIndex
                          ? 'ring-[3px] ring-primary/50 scale-105'
                          : 'opacity-60 hover:opacity-100 hover:scale-105 ring-1 ring-border/50'
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    >
                      <CloudinaryImage
                        src={imageId}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Side click-to-close regions outside the window */}
          <div
            className="absolute inset-y-0 left-0 w-[calc((100vw-min(80rem,100%))/2)] cursor-pointer"
            onClick={closeLightbox}
            aria-label="Close gallery"
          />
          <div
            className="absolute inset-y-0 right-0 w-[calc((100vw-min(80rem,100%))/2)] cursor-pointer"
            onClick={closeLightbox}
            aria-label="Close gallery"
          />
        </div>,
        document.body
      )}
    </>
  )
}

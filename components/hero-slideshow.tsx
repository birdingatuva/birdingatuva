"use client"

import { useEffect, useState, useMemo } from "react"
import Image from "next/image"

interface HeroSlideshowProps {
  images: string[]
}

// Slideshow timing configuration - adjust these values to change the timing
const SLIDE_INTERVAL_MS = 4000  // Time between slide changes (4 seconds)
const FADE_DURATION_MS = 2000   // Fade transition duration (1.5 seconds)

export function HeroSlideshow({ images }: HeroSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Randomize images order on component mount
  const shuffledImages = useMemo(() => {
    return [...images].sort(() => Math.random() - 0.5)
  }, []) // Empty dependency array ensures this only runs once on mount

  useEffect(() => {
    if (shuffledImages.length === 0) return

    const interval = setInterval(() => {
      setIsTransitioning(true)
      
        setTimeout(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % shuffledImages.length)
          setIsTransitioning(false)
        }, FADE_DURATION_MS)
    }, SLIDE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [shuffledImages.length])

  if (images.length === 0) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-blue-700" />
    )
  }

  return (
    <div className="absolute inset-0 z-10" style={{ backgroundColor: 'hsla(36, 7%, 44%, 1.00)' }}>
      {shuffledImages.map((imageName, index) => {
        // Only render current, previous, and next images to keep DOM lightweight
        const prevIndex = (currentIndex - 1 + shuffledImages.length) % shuffledImages.length
        const nextIndex = (currentIndex + 1) % shuffledImages.length
        const shouldRender = index === currentIndex || index === prevIndex || index === nextIndex
        
        return (
          <div
            key={imageName}
            className={`absolute inset-0 transition-opacity ${
              index === currentIndex
                ? "opacity-100"
                : "opacity-0"
            }`}
            style={{ 
              transitionDuration: `${FADE_DURATION_MS}ms`,
              // Use pointer-events and visibility to hide but keep critical images in DOM
              pointerEvents: index === currentIndex ? 'auto' : 'none',
              display: shouldRender ? 'block' : 'none'
            }}
          >
            {shouldRender && (
              <Image
                src={imageName}
                alt=""
                fill
                className="object-cover brightness-75"
                priority={index === 0}
                sizes="100vw"
                loading={index === 0 ? "eager" : "lazy"}
              />
            )}
          </div>
        )
      })}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center text-white text-4xl font-bold"
        style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)' }}
      >
        {/* Club text content */}
      </div>
    </div>
  )
}

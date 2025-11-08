"use client"

import { CldImage } from 'next-cloudinary'

interface CloudinaryImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fill?: boolean
}

export function CloudinaryImage({
  src,
  alt,
  width = 1200,
  height = 800,
  className = '',
  fill = false,
}: CloudinaryImageProps) {
  // Don't render if no src provided
  if (!src || src.trim() === '') {
    return null
  }

  return (
    <CldImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      {...(fill ? { fill: true, sizes: "100vw" } : {})}
      className={className}
    />
  )
}

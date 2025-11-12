"use client"

import Image from "next/image"

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

  // When fill is true, don't pass width/height
  // When fill is false, use provided width/height or defaults
  const imageProps = fill 
    ? { fill: true as const, sizes: "100vw" }
    : { width, height }

  return (
    <Image
      src={src}
      alt={alt}
      {...imageProps}
      className={className}
    />
  )
}

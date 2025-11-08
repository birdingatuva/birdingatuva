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
  width,
  height,
  className = '',
  fill = false,
}: CloudinaryImageProps) {
  return (
    <CldImage
      src={src}
      alt={alt}
      {...(fill ? { fill: true } : { width, height })}
      className={className}
    />
  )
}

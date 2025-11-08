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
  width = 800,
  height = 600,
  className = '',
  fill = false,
}: CloudinaryImageProps) {
  return (
    <CldImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      fill={fill}
    />
  )
}

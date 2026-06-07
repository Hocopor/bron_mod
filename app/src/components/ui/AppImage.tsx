'use client'

import React, { useEffect, useRef } from 'react'
import Image, { ImageProps } from 'next/image'
import {
  buildUploadedImageSrcSet,
  getUploadedImageFallbackSrc,
  getUploadedImageSizes,
  isUploadedImagePath,
  type UploadedImageVariant,
} from '@/lib/media'

type Props = ImageProps & {
  variant?: UploadedImageVariant
}

export function AppImage(props: Props) {
  const {
    src,
    alt,
    className,
    fill,
    width,
    height,
    sizes,
    style,
    priority,
    onLoad,
    variant = 'content',
    ...rest
  } = props
  const srcValue = typeof src === 'string' ? src : src.toString()
  const imgRef = useRef<HTMLImageElement>(null)

  // Fire onLoad for cached images: browsers may fire the native load event
  // before React attaches its handler, leaving the spinner stuck forever.
  useEffect(() => {
    const el = imgRef.current
    if (el?.complete && el.naturalWidth > 0 && onLoad) {
      ;(onLoad as React.ReactEventHandler<HTMLImageElement>)(
        { target: el } as unknown as React.SyntheticEvent<HTMLImageElement>,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isUploadedImagePath(srcValue)) {
    const uploadedSizes = sizes || getUploadedImageSizes(variant)
    const uploadedSrc = getUploadedImageFallbackSrc(srcValue, variant)
    const uploadedSrcSet = buildUploadedImageSrcSet(srcValue, variant)
    const loading = priority ? undefined : 'lazy'

    if (fill) {
      return (
        <img
          ref={imgRef}
          src={uploadedSrc}
          srcSet={uploadedSrcSet}
          sizes={uploadedSizes}
          alt={alt}
          className={className}
          loading={loading}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={onLoad as React.ReactEventHandler<HTMLImageElement>}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            ...style,
          }}
        />
      )
    }

    return (
      <img
        ref={imgRef}
        src={uploadedSrc}
        srcSet={uploadedSrcSet}
        sizes={uploadedSizes}
        alt={alt}
        width={typeof width === 'number' ? width : undefined}
        height={typeof height === 'number' ? height : undefined}
        className={className}
        loading={loading}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={onLoad as React.ReactEventHandler<HTMLImageElement>}
        style={style}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      style={style}
      priority={priority}
      onLoad={onLoad}
      {...rest}
    />
  )
}

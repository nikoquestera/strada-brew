import { CfitCrop } from '@/lib/cfit/data'

interface Props {
  crop: CfitCrop
  alt: string
  maxWidth?: number
}

export default function CfitCropImage({ crop, alt, maxWidth = 980 }: Props) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth,
      }}
    >
      <svg
        viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
        role="img"
        aria-label={alt}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: '16px',
          border: '1.5px solid #E8E4E0',
          backgroundColor: '#fff',
        }}
      >
        <image
          href={crop.src}
          x="0"
          y="0"
          width="2600"
          height="1700"
          preserveAspectRatio="none"
        />
      </svg>
    </div>
  )
}

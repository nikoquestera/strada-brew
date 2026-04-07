import { CfitVisual } from '@/lib/cfit/data'

interface Props {
  visual: CfitVisual
  alt: string
  maxWidth?: number
  compact?: boolean
}

const frameStyle = {
  width: '100%',
  display: 'block',
  backgroundColor: '#FFFFFF',
  border: '1.5px solid #E8E4E0',
  borderRadius: '18px',
}

export default function CfitCropImage({ visual, alt, maxWidth = 980, compact = false }: Props) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth,
        margin: '0 auto',
      }}
    >
      {visual.mode === 'single' ? (
        <div
          style={{
            ...frameStyle,
            padding: compact ? '12px' : '16px',
            boxShadow: compact ? 'none' : '0 10px 24px rgba(0,0,0,0.04)',
          }}
        >
          <img
            src={visual.src}
            alt={alt}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: '12px',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: compact ? '10px' : '12px',
          }}
        >
          <div
            style={{
              ...frameStyle,
              padding: compact ? '12px 12px 8px' : '16px 16px 10px',
              boxShadow: compact ? 'none' : '0 8px 20px rgba(0,0,0,0.04)',
            }}
          >
            <img
              src={visual.promptSrc}
              alt={`${alt} soal`}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '12px',
              }}
            />
          </div>
          <div
            style={{
              ...frameStyle,
              padding: compact ? '10px 12px 8px' : '14px 16px 10px',
              boxShadow: compact ? 'none' : '0 8px 20px rgba(0,0,0,0.04)',
            }}
          >
            <img
              src={visual.optionsSrc}
              alt={`${alt} pilihan jawaban`}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '12px',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

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
  const splitLayout = visual.mode === 'stacked' && visual.layout === 'split'
  const promptFrameMinHeight = splitLayout ? (compact ? 140 : 220) : (compact ? 120 : 180)
  const optionsFrameMinHeight = splitLayout ? (compact ? 140 : 220) : (compact ? 140 : 210)

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
        <div style={{ display: 'grid', gap: compact ? '10px' : '12px' }}>
          <style>{`
            @media (max-width: 640px) {
              .cfit-split-visual {
                grid-template-columns: minmax(96px, 132px) minmax(0, 1fr) !important;
                align-items: start !important;
              }
              .cfit-split-prompt,
              .cfit-split-options {
                max-width: 100% !important;
              }
              .cfit-split-frame {
                padding: 10px !important;
              }
              .cfit-visual-prompt-box {
                min-height: 120px !important;
              }
              .cfit-visual-options-box {
                min-height: 132px !important;
              }
            }
          `}</style>
          <div
            className={splitLayout ? 'cfit-split-visual' : undefined}
            style={{
              display: 'grid',
              gap: compact ? '10px' : '12px',
              gridTemplateColumns: splitLayout ? 'minmax(140px, 220px) minmax(0, 1fr)' : '1fr',
              alignItems: splitLayout ? 'center' : 'stretch',
            }}
          >
          <div
            className={splitLayout ? 'cfit-split-prompt cfit-split-frame' : undefined}
            style={{
              ...frameStyle,
              padding: compact ? '12px 12px 8px' : '16px 16px 10px',
              boxShadow: compact ? 'none' : '0 8px 20px rgba(0,0,0,0.04)',
              maxWidth: splitLayout ? visual.promptPanelMaxWidth : undefined,
              margin: splitLayout ? '0 auto' : undefined,
            }}
          >
            <div
              className="cfit-visual-prompt-box"
              style={{
                minHeight: promptFrameMinHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={visual.promptSrc}
                alt={`${alt} soal`}
                style={{
                  width: '100%',
                  maxHeight: `${promptFrameMinHeight}px`,
                  height: 'auto',
                  display: 'block',
                  borderRadius: '12px',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
          <div
            className={splitLayout ? 'cfit-split-options cfit-split-frame' : undefined}
            style={{
              ...frameStyle,
              padding: compact ? '10px 12px 8px' : '14px 16px 10px',
              boxShadow: compact ? 'none' : '0 8px 20px rgba(0,0,0,0.04)',
              maxWidth: splitLayout ? visual.optionsPanelMaxWidth : undefined,
              width: '100%',
            }}
          >
            <div
              className="cfit-visual-options-box"
              style={{
                minHeight: optionsFrameMinHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={visual.optionsSrc}
                alt={`${alt} pilihan jawaban`}
                style={{
                  width: '100%',
                  maxHeight: `${optionsFrameMinHeight}px`,
                  height: 'auto',
                  display: 'block',
                  borderRadius: '12px',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}

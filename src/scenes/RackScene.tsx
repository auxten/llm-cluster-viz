import { useMemo } from 'react'
import { Floor } from './Floor'
import { NVL72Rack } from '../components/3d/rack/NVL72Rack'
import { Html } from '@react-three/drei'
import { StorylineLayer } from '../storylines'
import { useT } from '../i18n'

/**
 * Rack 层：聚焦单个 NVL72，展开内部 tray、backplane、cooling。
 */
export function RackScene() {
  const t = useT()
  const labels = useMemo(
    () => [
      { y: 1.85, text: t('rack.scene.label.topTray'), side: 'left' as const },
      { y: 1.05, text: t('rack.scene.label.midTray'), side: 'right' as const },
      { y: 0.35, text: t('rack.scene.label.bottomTray'), side: 'left' as const },
    ],
    [t],
  )

  return (
    <group>
      <Floor size={14} divisions={14} />
      <NVL72Rack position={[0, 0, 0]} highlight lod="high" />
      {labels.map((l, i) => (
        <Html
          key={i}
          position={[l.side === 'left' ? -0.85 : 0.85, l.y, 0]}
          center
          style={{
            pointerEvents: 'none',
            color: 'var(--color-fg)',
            fontSize: '11.5px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(20, 26, 40, 0.78)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.4)',
          }}
        >
          {l.text}
        </Html>
      ))}

      <StorylineLayer layer="rack" />
    </group>
  )
}

import { useStory } from '../state/storyStore'
import type { LayerId } from '../data/storylines'
import { useT } from '../i18n'

const items: { id: LayerId; labelKey: string; subKey: string }[] = [
  {
    id: 'datacenter',
    labelKey: 'nav.layer.datacenter.label',
    subKey: 'nav.layer.datacenter.sub',
  },
  {
    id: 'rack',
    labelKey: 'nav.layer.rack.label',
    subKey: 'nav.layer.rack.sub',
  },
  {
    id: 'chip',
    labelKey: 'nav.layer.chip.label',
    subKey: 'nav.layer.chip.sub',
  },
]

export function LayerNav() {
  const layer = useStory((s) => s.layer)
  const setLayer = useStory((s) => s.setLayer)
  const t = useT()

  return (
    <div className="panel pointer-events-auto inline-flex rounded-full p-1 text-xs">
      {items.map((it) => {
        const active = layer === it.id
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => setLayer(it.id)}
            className={`group flex flex-col items-start rounded-full px-4 py-1.5 transition-colors ${
              active
                ? 'bg-[color:var(--color-accent)]/15 text-accent'
                : 'text-fg-soft hover:text-fg'
            }`}
          >
            <span className="font-medium leading-tight">{t(it.labelKey)}</span>
            <span className="text-[10px] leading-tight text-fg-mute">
              {t(it.subKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

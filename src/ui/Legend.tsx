import { useT } from '../i18n'

export function Legend() {
  const t = useT()
  return (
    <div className="panel pointer-events-auto flex items-center gap-4 rounded-full px-4 py-2 text-[11px] text-fg-soft">
      <LegendDot color="var(--color-nvlink)" label={t('legend.nvlink')} />
      <LegendDot color="var(--color-ib)" label={t('legend.ib')} />
      <LegendDot color="var(--color-token)" label={t('legend.token')} />
      <LegendDot color="var(--color-coolant-cold)" label={t('legend.coolant.cold')} />
      <LegendDot color="var(--color-coolant-hot)" label={t('legend.coolant.hot')} />
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      <span>{label}</span>
    </span>
  )
}

import React, { useState } from 'react'
import dayjs from 'dayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LuChartColumn, LuGamepad2, LuSearch } from 'react-icons/lu'
import { Button, SegmentedControl } from '../../components/ui'
import PlatformMetrics from './PlatformMetrics'
import GameMetricsBuilder from './GameMetricsBuilder'

const VIEWS = [
  { id: 'platform', label: 'Plataforma', icon: <LuChartColumn size={14} /> },
  { id: 'game', label: 'Por jogo', icon: <LuGamepad2 size={14} /> },
]

const isValid = d => !d || (typeof d.isValid === 'function' && d.isValid())

/**
 * Período e visão são "rascunho" até clicar em Aplicar; só o `applied` chega
 * às visões — evita disparar requisições a cada tecla no DatePicker.
 */
export default function MetricsTab({ games }) {
  const [view, setView] = useState('platform')
  const [draftFrom, setDraftFrom] = useState(() => dayjs().subtract(7, 'day'))
  const [draftTo, setDraftTo] = useState(() => dayjs())
  const [applied, setApplied] = useState(() => ({ from: dayjs().subtract(7, 'day'), to: dayjs() }))

  const apply = () => {
    if (!isValid(draftFrom) || !isValid(draftTo)) return
    setApplied({ from: draftFrom, to: draftTo })
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="a2l-filters" style={{ marginBottom: 24 }}>
        <SegmentedControl value={view} onChange={setView} items={VIEWS} />
        <DatePicker
          label="De"
          value={draftFrom}
          onChange={setDraftFrom}
          slotProps={{ textField: { size: 'small' } }}
        />
        <DatePicker
          label="Até"
          value={draftTo}
          onChange={setDraftTo}
          slotProps={{ textField: { size: 'small' } }}
        />
        <Button
          onClick={apply}
          icon={<LuSearch size={16} />}
          disabled={!isValid(draftFrom) || !isValid(draftTo)}
        >
          Aplicar
        </Button>
      </div>

      {view === 'platform' ? (
        <PlatformMetrics range={applied} />
      ) : (
        <GameMetricsBuilder games={games} range={applied} />
      )}
    </LocalizationProvider>
  )
}

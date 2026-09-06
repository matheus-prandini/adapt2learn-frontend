import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LuChartColumn, LuGamepad2, LuSearch } from 'react-icons/lu'
import { Button, SegmentedControl } from '../../components/ui'
import { useTheme } from '../../theme/ThemeContext'
import { createMuiTheme } from '../../theme/muiTheme'
import PlatformMetrics from './PlatformMetrics'
import GameMetricsBuilder from './GameMetricsBuilder'

const VIEWS = [
  { id: 'platform', label: 'Plataforma', icon: <LuChartColumn size={14} /> },
  { id: 'game', label: 'Por jogo', icon: <LuGamepad2 size={14} /> },
]

const isValid = d => !d || (typeof d.isValid === 'function' && d.isValid())
const initialRange = () => ({ from: dayjs().subtract(7, 'day'), to: dayjs() })

/**
 * Período é "rascunho" até clicar em Aplicar; só o `applied` chega às visões —
 * evita disparar requisições a cada tecla no DatePicker.
 *
 * As duas visões ficam montadas e alternam com `hidden`: trocar de visão não
 * refaz /metrics/overview nem apaga o que o admin montou no builder.
 *
 * O MUI (DatePicker) só existe nesta aba, então o ThemeProvider dele vive aqui
 * e não na raiz — assim MUI + emotion ficam fora do chunk inicial do aluno.
 */
export default function MetricsTab({ games }) {
  const { theme } = useTheme()
  const muiTheme = useMemo(() => createMuiTheme(theme), [theme])

  const [view, setView] = useState('platform')
  const [draft, setDraft] = useState(initialRange)
  const [applied, setApplied] = useState(draft)

  const draftValid = isValid(draft.from) && isValid(draft.to)
  const apply = () => {
    if (draftValid) setApplied(draft)
  }

  return (
    <MuiThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="a2l-filters" style={{ marginBottom: 24 }}>
          <SegmentedControl value={view} onChange={setView} items={VIEWS} />
          <DatePicker
            label="De"
            value={draft.from}
            onChange={from => setDraft(d => ({ ...d, from }))}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="Até"
            value={draft.to}
            onChange={to => setDraft(d => ({ ...d, to }))}
            slotProps={{ textField: { size: 'small' } }}
          />
          <Button onClick={apply} icon={<LuSearch size={16} />} disabled={!draftValid}>
            Aplicar
          </Button>
        </div>

        <div hidden={view !== 'platform'}>
          <PlatformMetrics range={applied} />
        </div>
        <div hidden={view !== 'game'}>
          <GameMetricsBuilder games={games} range={applied} />
        </div>
      </LocalizationProvider>
    </MuiThemeProvider>
  )
}

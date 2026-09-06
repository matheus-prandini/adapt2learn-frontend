import { useMemo } from 'react'
import { useTheme } from '../../theme/ThemeContext'
import { getChartPalette, getColors, getShadow } from '../../theme/tokens'

/**
 * Props prontas para os componentes do Recharts, já no tema atual.
 * Recharts recebe valores concretos — não lê CSS custom properties.
 */
export function useChartTheme() {
  const { theme } = useTheme()
  return useMemo(() => {
    const colors = getColors(theme)
    return {
      colors,
      palette: getChartPalette(theme),
      grid: { strokeDasharray: '3 3', stroke: colors.lineSoft, vertical: false },
      xAxis: {
        tick: { fill: colors.ink[500], fontSize: 12 },
        tickLine: false,
        axisLine: { stroke: colors.line },
      },
      yAxis: { tick: { fill: colors.ink[500], fontSize: 12 }, tickLine: false, axisLine: false },
      legend: { wrapperStyle: { fontSize: 12, color: colors.ink[500] } },
      tooltip: {
        contentStyle: {
          background: colors.surface,
          borderRadius: 12,
          border: `1px solid ${colors.line}`,
          boxShadow: getShadow(theme).lg,
          fontSize: 13,
          color: colors.ink[900],
        },
        itemStyle: { color: colors.ink[700] },
        labelStyle: { color: colors.ink[900], fontWeight: 700 },
        cursor: { fill: colors.lineSoft },
      },
    }
  }, [theme])
}

import React from 'react'
import Select from 'react-select'
import { SCHOOLS } from '../../constants/schools'

const OPTIONS = SCHOOLS.map(s => ({ value: s, label: s }))

/** Seletor de escola compartilhado pelas abas de alunos e sessões. */
export default function SchoolSelect({ value, onChange, minWidth = 220 }) {
  return (
    <Select
      classNamePrefix="a2l-select"
      options={OPTIONS}
      value={OPTIONS.find(o => o.value === value) ?? null}
      onChange={opt => onChange(opt?.value ?? '')}
      placeholder="Escola"
      aria-label="Escola"
      styles={{ container: base => ({ ...base, minWidth }) }}
    />
  )
}

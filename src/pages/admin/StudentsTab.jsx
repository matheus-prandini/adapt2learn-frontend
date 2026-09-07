import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { LuInbox } from 'react-icons/lu'
import { apiJson } from '../../api/httpClient'
import { Card, EmptyState, Loader } from '../../components/ui'
import SchoolSelect from './SchoolSelect'
import SectionTitle from './SectionTitle'

export default function StudentsTab({ school, onSchoolChange }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!school) {
      setStudents([])
      return undefined
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const qs = new URLSearchParams({ role: 'student', school_id: school })
        const data = await apiJson(`/users?${qs}`, undefined, 'Erro ao carregar a lista de alunos.')
        if (!cancelled) setStudents(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) toast.error(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [school])

  return (
    <>
      <SectionTitle>Alunos</SectionTitle>
      <div className="a2l-filters">
        <SchoolSelect value={school} onChange={onSchoolChange} />
      </div>

      {loading ? (
        <Loader label="Carregando alunos…" />
      ) : students.length === 0 ? (
        <Card quiet>
          <EmptyState icon={<LuInbox size={22} />} title="Nenhum aluno nesta escola" />
        </Card>
      ) : (
        <div className="a2l-table-wrap">
          <table className="a2l-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Grupo / Série</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.uid}>
                  <td>{s.name}</td>
                  <td>{s.mail}</td>
                  <td>{s.group || s.grade_level || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

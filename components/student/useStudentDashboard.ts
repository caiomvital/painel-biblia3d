'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StudentDashboardData } from './student-types';

/** Carga de GET /api/student/dashboard e marcação de presença (mesmo comportamento de antes). */
export function useStudentDashboard() {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingAttendance, setRequestingAttendance] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState<string | null>(null);
  const [attendanceErrorMsg, setAttendanceErrorMsg] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/student/dashboard');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar painel do aluno.');
      setData(json);
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/student/dashboard', { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao carregar painel do aluno.');
        return json;
      })
      .then((json) => {
        if (controller.signal.aborted) return;
        setData(json);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const markAttendance = useCallback(async (lessonId: string) => {
    setRequestingAttendance(true);
    setAttendanceSuccessMsg(null);
    setAttendanceErrorMsg(null);
    try {
      const res = await fetch('/api/student/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao marcar presença.');
      setAttendanceSuccessMsg('Sua presença foi registrada como PENDENTE. O professor validará em sala.');
      await fetchDashboard();
    } catch (err: unknown) {
      setAttendanceErrorMsg(err instanceof Error ? err.message : 'Não foi possível solicitar presença.');
    } finally {
      setRequestingAttendance(false);
    }
  }, [fetchDashboard]);

  return { data, loading, error, fetchDashboard, requestingAttendance, attendanceSuccessMsg, attendanceErrorMsg, markAttendance };
}

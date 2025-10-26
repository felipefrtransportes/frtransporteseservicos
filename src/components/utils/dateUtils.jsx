
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * ✅ Sistema usa horário LOCAL do dispositivo
 * Não há conversões de fuso horário - tudo baseado no relógio do aparelho
 */

/**
 * Formata uma data no horário LOCAL do dispositivo
 */
export function formatBrasiliaDate(date, formatString = 'dd/MM/yyyy HH:mm') {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    return format(dateObj, formatString, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '';
  }
}

/**
 * Retorna a data/hora atual no horário LOCAL do dispositivo
 */
export function getNowBrasilia() {
  return new Date();
}

/**
 * Retorna a data atual em formato yyyy-MM-dd (LOCAL)
 */
export function getTodayBrasilia() {
  const now = new Date();
  return format(now, 'yyyy-MM-dd');
}

/**
 * Formata uma data de forma curta (dd/MM/yyyy)
 */
export function formatDateShort(date) {
  return formatBrasiliaDate(date, 'dd/MM/yyyy');
}

/**
 * Formata uma data com hora (dd/MM/yyyy HH:mm)
 */
export function formatDateTime(date) {
  return formatBrasiliaDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Formata apenas a hora (HH:mm)
 */
export function formatTimeOnly(date) {
  return formatBrasiliaDate(date, 'HH:mm');
}

/**
 * Formata data por extenso (01 de Janeiro de 2024)
 */
export function formatDateFull(date) {
  return formatBrasiliaDate(date, "dd 'de' MMMM 'de' yyyy");
}

/**
 * Formata data e hora por extenso (01 de Janeiro de 2024 às 14:30)
 */
export function formatDateTimeFull(date) {
  return formatBrasiliaDate(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm");
}

/**
 * Retorna data no formato ISO para inputs (yyyy-MM-dd)
 * Usa horário LOCAL do dispositivo
 */
export function toInputDate(date) {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(dateObj, 'yyyy-MM-dd');
}

/**
 * Retorna data/hora no formato para inputs datetime-local (yyyy-MM-dd'T'HH:mm)
 * Usa horário LOCAL do dispositivo
 */
export function toInputDateTime(date) {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(dateObj, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Converte input datetime-local para ISO mantendo horário LOCAL
 */
export function fromInputDateTimeToISO(inputDateTime) {
  if (!inputDateTime) return null;
  const date = new Date(inputDateTime);
  return date.toISOString();
}

/**
 * Converte uma data string (yyyy-MM-dd) para ISO
 */
export function fromInputDateToISO(inputDate) {
  if (!inputDate) return null;
  const date = new Date(inputDate + 'T00:00:00');
  return date.toISOString();
}

/**
 * Calcula diferença em minutos entre duas datas
 */
export function getMinutesDifference(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : new Date(date1);
  const d2 = typeof date2 === 'string' ? parseISO(date2) : new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / 60000);
}

/**
 * Verifica se uma data é hoje
 */
export function isToday(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const today = new Date();
  return format(dateObj, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
}

/**
 * Retorna texto relativo (ex: "há 5 minutos", "daqui a 2 horas")
 */
export function getRelativeTime(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const now = new Date();
  const diffMinutes = Math.floor((dateObj.getTime() - now.getTime()) / 60000);
  
  if (diffMinutes === 0) return 'agora';
  
  if (diffMinutes > 0) {
    if (diffMinutes < 60) return `daqui a ${diffMinutes} min`;
    if (diffMinutes < 1440) return `daqui a ${Math.floor(diffMinutes / 60)}h`;
    return `daqui a ${Math.floor(diffMinutes / 1440)} dias`;
  } else {
    const absMinutes = Math.abs(diffMinutes);
    if (absMinutes < 60) return `há ${absMinutes} min`;
    if (absMinutes < 1440) return `há ${Math.floor(absMinutes / 60)}h`;
    return `há ${Math.floor(absMinutes / 1440)} dias`;
  }
}

/**
 * Converte ISO para data local do dispositivo
 */
export function toLocalDate(isoString) {
  if (!isoString) return null;
  return new Date(isoString);
}

/**
 * Retorna horário atual como ISO
 */
export function getCurrentISOTime() {
  return new Date().toISOString();
}

// Helper para criar URL de página
export const createPageUrl = (pageName) => {
  return `/${pageName.toLowerCase()}`;
};

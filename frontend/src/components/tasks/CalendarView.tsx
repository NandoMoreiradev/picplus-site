import { useMemo } from 'react';
import styled from 'styled-components';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import type { EventDropArg, EventInput } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import type { TaskActions } from '../../hooks/useTaskActions';
import { addDaysYmd, fromDateInput, readableOn, toDateInput, todayYmd } from '../../lib/tasks';
import type { Task } from '../../lib/tasks';
import { useToast } from '../ui/Toast';

const Wrap = styled.div`
  height: 100%;
  min-height: 0;
  padding: 1.25rem 1.5rem 1rem;

  .note {
    margin: 0 0 0.6rem;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }

  /* O FullCalendar se tema por variáveis CSS: aqui ele ganha o visual escuro do painel. */
  .fc {
    --fc-page-bg-color: ${({ theme }) => theme.colors.surface};
    --fc-neutral-bg-color: ${({ theme }) => theme.colors.surfaceHover};
    --fc-neutral-text-color: ${({ theme }) => theme.colors.textSecondary};
    --fc-border-color: ${({ theme }) => theme.colors.border};
    --fc-today-bg-color: ${({ theme }) => theme.colors.primarySoft};
    --fc-event-border-color: transparent;
    --fc-list-event-hover-bg-color: ${({ theme }) => theme.colors.surfaceHover};
    --fc-more-link-bg-color: ${({ theme }) => theme.colors.surfaceHover};
    --fc-highlight-color: ${({ theme }) => theme.colors.primarySoft};
    font-family: inherit;
    height: 100%;
  }
  .fc .fc-scrollgrid,
  .fc .fc-list {
    border-radius: ${({ theme }) => theme.radii.md};
    overflow: hidden;
  }
  .fc .fc-toolbar {
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .fc .fc-toolbar-title {
    font-size: 1.15rem;
    font-weight: 800;
    text-transform: none;
  }
  .fc .fc-toolbar-title::first-letter {
    text-transform: uppercase;
  }
  .fc .fc-button {
    background: transparent;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    color: ${({ theme }) => theme.colors.text};
    border-radius: ${({ theme }) => theme.radii.sm};
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: capitalize;
    box-shadow: none !important;
  }
  .fc .fc-button:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: transparent;
  }
  .fc .fc-button-primary:not(:disabled).fc-button-active,
  .fc .fc-button-primary:not(:disabled):active {
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
  }
  .fc .fc-button:disabled {
    opacity: 0.4;
  }
  .fc .fc-col-header-cell-cushion,
  .fc .fc-daygrid-day-number {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 700;
    font-size: 0.8rem;
    text-decoration: none;
  }
  .fc .fc-col-header-cell {
    background: ${({ theme }) => theme.colors.background};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .fc .fc-day-today .fc-daygrid-day-number {
    color: ${({ theme }) => theme.colors.primary};
  }
  .fc .fc-day-other .fc-daygrid-day-top {
    opacity: 0.4;
  }
  .fc .fc-daygrid-day:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  .fc .fc-daygrid-day-frame {
    cursor: pointer;
  }
  .fc .fc-event {
    border: none;
    border-radius: 5px;
    padding: 1px 4px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
  }
  .fc .fc-event.done {
    opacity: 0.5;
    text-decoration: line-through;
  }
  .fc .fc-event.overdue {
    box-shadow: inset 0 0 0 1.5px ${({ theme }) => theme.colors.danger};
  }
  .fc .fc-event:hover {
    filter: brightness(1.12);
  }
  .fc .fc-list-day-cushion {
    background: ${({ theme }) => theme.colors.surfaceHover};
    font-weight: 800;
  }
  .fc .fc-list-event {
    cursor: pointer;
  }
  .fc .fc-list-empty {
    background: transparent;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .fc a {
    color: inherit;
  }
`;

/** Data local de um objeto Date, como AAAA-MM-DD. */
const dayOf = (date: Date) => todayYmd(date);

interface Props {
  tasks: Task[];
  actions: TaskActions;
  canCreate: boolean;
  canEdit: boolean;
  onOpen: (task: Task) => void;
  /** Clique num dia vazio: criar uma tarefa com esse prazo (AAAA-MM-DD). */
  onCreateOn: (ymd: string) => void;
}

export function CalendarView({ tasks, actions, canCreate, canEdit, onOpen, onCreateOn }: Props) {
  const toast = useToast();
  const today = todayYmd();

  const { events, undated } = useMemo(() => {
    const dated: EventInput[] = [];
    let without = 0;
    for (const task of tasks) {
      const due = task.dueDate ? toDateInput(task.dueDate) : '';
      const start = task.startDate ? toDateInput(task.startDate) : due;
      if (!start && !due) {
        without += 1;
        continue;
      }
      const first = start || due;
      const last = due || start;
      const color = task.stage.color;
      dated.push({
        id: task.id,
        title: task.title,
        start: first,
        // O fim de um evento de dia inteiro é exclusivo: soma-se 1 dia.
        end: addDaysYmd(last < first ? first : last, 1),
        allDay: true,
        backgroundColor: color,
        textColor: readableOn(color),
        classNames: [task.completedAt ? 'done' : '', !task.completedAt && due && due < today ? 'overdue' : ''].filter(Boolean),
        extendedProps: { task },
      });
    }
    return { events: dated, undated: without };
  }, [tasks, today]);

  /** Salva o novo intervalo depois de arrastar ou redimensionar; desfaz se o servidor recusar. */
  const reschedule = async (info: EventDropArg | EventResizeDoneArg) => {
    const task = info.event.extendedProps.task as Task;
    if (!info.event.start) return info.revert();
    const start = dayOf(info.event.start);
    // `end` é exclusivo (e vem vazio em eventos de um dia só).
    const due = info.event.end ? addDaysYmd(dayOf(info.event.end), -1) : start;
    const keepsStart = !!task.startDate || start !== due;
    const saved = await actions.update(task.id, {
      ...(keepsStart ? { startDate: fromDateInput(start) } : {}),
      dueDate: fromDateInput(due),
    });
    if (!saved) info.revert();
    else toast.success('Prazo atualizado.');
  };

  return (
    <Wrap>
      {undated > 0 && (
        <p className="note">
          {undated} {undated === 1 ? 'tarefa sem prazo não aparece' : 'tarefas sem prazo não aparecem'} no calendário (veja na lista).
        </p>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locales={[ptBrLocale]}
        locale="pt-br"
        height={undated > 0 ? 'calc(100% - 1.6rem)' : '100%'}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,listMonth' }}
        buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Agenda' }}
        events={events}
        editable={canEdit}
        eventResizableFromStart={canEdit}
        dayMaxEvents
        fixedWeekCount={false}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          onOpen(info.event.extendedProps.task as Task);
        }}
        dateClick={canCreate ? (info) => onCreateOn(info.dateStr.slice(0, 10)) : undefined}
        eventDrop={(info) => void reschedule(info)}
        eventResize={(info) => void reschedule(info)}
        noEventsText="Nenhuma tarefa com prazo neste período."
      />
    </Wrap>
  );
}

import { AnimatePresence } from 'motion/react'
import { useUI, type Sheet } from '../store/ui'
import { QuickAdd } from './add/QuickAdd'
import { HabitEditSheet, HabitSheet } from './habits/HabitSheets'
import { BudgetSheet, GoalEditSheet, GoalSheet, TxSheet } from './money/MoneySheets'
import { EventSheet } from './plan/EventSheet'
import { PickTodaySheet, ScheduleSheet, SlotSheet } from './plan/SlotSheets'
import { SubjectSheet } from './plan/SubjectSheet'
import { PinSheet } from './settings/PinSheet'
import { SettingsSheet } from './settings/Settings'
import { ClassEditSheet, SubjectEditSheet } from './settings/TimetableSheets'
import { TaskSheet } from './tasks/TaskSheet'

function SheetFor({ sheet }: { sheet: Sheet }) {
  switch (sheet.type) {
    case 'quick':
      return <QuickAdd sheet={sheet} />
    case 'task':
      return <TaskSheet id={sheet.id} />
    case 'event':
      return <EventSheet id={sheet.id} date={sheet.date} start={sheet.start} end={sheet.end} />
    case 'subject':
      return <SubjectSheet id={sheet.id} />
    case 'habit':
      return sheet.id ? <HabitSheet id={sheet.id} /> : <HabitEditSheet />
    case 'habitEdit':
      return <HabitEditSheet id={sheet.id} />
    case 'tx':
      return <TxSheet id={sheet.id} />
    case 'goal':
      return sheet.id ? <GoalSheet id={sheet.id} /> : <GoalEditSheet />
    case 'goalEdit':
      return <GoalEditSheet id={sheet.id} />
    case 'settings':
      return <SettingsSheet />
    case 'pin':
      return <PinSheet purpose={sheet.purpose} then={sheet.then} />
    case 'slot':
      return <SlotSheet date={sheet.date} start={sheet.start} end={sheet.end} />
    case 'schedule':
      return <ScheduleSheet taskId={sheet.taskId} />
    case 'budget':
      return <BudgetSheet />
    case 'classEdit':
      return <ClassEditSheet id={sheet.id} subjectId={sheet.subjectId} />
    case 'subjectEdit':
      return <SubjectEditSheet id={sheet.id} />
    case 'pickToday':
      return <PickTodaySheet />
  }
}

export function SheetHost() {
  const sheets = useUI((s) => s.sheets)
  return (
    <AnimatePresence>
      {sheets.map((s) => (
        <SheetFor key={s.key} sheet={s} />
      ))}
    </AnimatePresence>
  )
}

# Prompt: P3-T2 — Integrate MorningFinalizeModal

Context: `docs/.implementation/sprint3/phase3/phase3-task2-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 3), `docs/.implementation/sprint3/tasks.md` (P3-T2)

## Goal

Integrate the existing `MorningFinalizeModal.tsx` into the planner tab with time-based auto-trigger and manual button.

## Prerequisites

- P3-T1 complete (finalize API endpoint and apiClient method)
- P1-T4 complete (PlannerScreen component exists)

## Deliverables

- Morning window detection logic
- Modal state management in PlannerScreen
- Auto-trigger on planner mount during morning window
- Manual "Finalize Plan" button in planner header
- Refresh planner after finalization

## Implementation steps (from tasks)

1. In `PlannerScreen.tsx`, add state:
   ```typescript
   const [showMorningModal, setShowMorningModal] = useState(false)
   const [todayPlan, setTodayPlan] = useState<Plan | null>(null)
   const [planTasks, setPlanTasks] = useState<Item[]>([])
   ```

2. Create helper function `isInMorningWindow()`:
   ```typescript
   function isInMorningWindow(): boolean {
     const now = new Date()
     const hours = now.getHours()
     const minutes = now.getMinutes()
     const currentMinutes = hours * 60 + minutes

     // Default: 7:00 AM - 9:00 AM (420-540 minutes)
     // TODO: P3-T5 will read from settings
     const startMinutes = 7 * 60  // 7:00 AM
     const endMinutes = 9 * 60    // 9:00 AM

     return currentMinutes >= startMinutes && currentMinutes <= endMinutes
   }
   ```

3. Add useEffect for morning modal trigger on mount:
   ```typescript
   useEffect(() => {
     async function checkMorningFlow() {
       if (!isInMorningWindow()) return

       const today = new Date().toISOString().split('T')[0]
       try {
         const { plan } = await apiClient.getPlan(today)
         if (plan && plan.status === 'draft') {
           setTodayPlan(plan)
           // Fetch tasks associated with plan
           const { items } = await apiClient.getItems({ type: 'task' })
           // Filter to planned tasks (or fetch via plan-tasks join)
           setPlanTasks(items)
           setShowMorningModal(true)
         }
       } catch (error) {
         // No plan for today, ignore
       }
     }

     checkMorningFlow()
   }, [])
   ```

4. Import and render `MorningFinalizeModal`:
   ```typescript
   import { MorningFinalizeModal } from '@/components/MorningFinalizeModal'

   // In render:
   {showMorningModal && todayPlan && (
     <MorningFinalizeModal
       plan={todayPlan}
       tasks={planTasks}
       onClose={() => setShowMorningModal(false)}
       onFinalize={handleMorningFinalize}
     />
   )}
   ```

5. Create `handleMorningFinalize` callback:
   ```typescript
   const handleMorningFinalize = useCallback(async () => {
     setShowMorningModal(false)
     // Refresh planner data
     await fetchAssignments(selectedDate)
     // Show success toast
   }, [selectedDate, fetchAssignments])
   ```

6. Add manual "Finalize Plan" button in planner header:
   ```typescript
   {todayPlan?.status === 'draft' && (
     <RetroButton
       onClick={() => setShowMorningModal(true)}
       variant="primary"
       size="sm"
     >
       Finalize Plan
     </RetroButton>
   )}
   ```

7. Test the complete flow:
   - Mock system time to morning window
   - Create draft plan for today
   - Navigate to planner, verify modal auto-shows
   - Reorder tasks, remove one, finalize
   - Verify plan status is 'finalized'
   - Modal should not reappear on next mount

## Acceptance criteria

- Modal auto-triggers during morning window with draft plan
- Manual button triggers modal outside window
- Task reordering works in modal
- Task removal works in modal
- Finalize updates plan status and closes modal
- Planner refreshes after finalization
- Modal doesn't appear for already-finalized plans

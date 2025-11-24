# Prompt: P3-T3 — Integrate EveningReviewFlow

Context: `docs/.implementation/sprint3/phase3/phase3-task3-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 3), `docs/.implementation/sprint3/tasks.md` (P3-T3)

## Goal

Integrate the existing `EveningReviewFlow.tsx` into the planner tab with time-based auto-trigger and manual button.

## Prerequisites

- P3-T1 complete (complete API endpoint and apiClient methods)
- P3-T2 complete (morning modal pattern established)
- P1-T4 complete (PlannerScreen component exists)

## Deliverables

- Evening window detection logic
- Modal state management in PlannerScreen
- Auto-trigger on planner mount during evening window
- Manual "Evening Review" button in planner header
- Refresh planner and optionally navigate after completion

## Implementation steps (from tasks)

1. In `PlannerScreen.tsx`, add state:
   ```typescript
   const [showEveningModal, setShowEveningModal] = useState(false)
   const [eveningReviewData, setEveningReviewData] = useState<{
     plan: PlanWithEntities
     projects: Item[]
     unparsedCount: number
   } | null>(null)
   ```

2. Create helper function `isInEveningWindow()`:
   ```typescript
   function isInEveningWindow(): boolean {
     const now = new Date()
     const hours = now.getHours()
     const minutes = now.getMinutes()
     const currentMinutes = hours * 60 + minutes

     // Default: 7:00 PM - 9:00 PM (1140-1260 minutes)
     // TODO: P3-T5 will read from settings
     const startMinutes = 19 * 60  // 7:00 PM
     const endMinutes = 21 * 60    // 9:00 PM

     return currentMinutes >= startMinutes && currentMinutes <= endMinutes
   }
   ```

3. Add useEffect for evening modal trigger on mount:
   ```typescript
   useEffect(() => {
     async function checkEveningFlow() {
       if (!isInEveningWindow()) return

       const today = new Date().toISOString().split('T')[0]
       try {
         // Need to fetch plan with entities for EveningReviewFlow
         const { plan } = await apiClient.getPlan(today)
         if (plan && plan.status === 'finalized') {
           // Fetch additional data
           const { items: tasks } = await apiClient.getItems({ type: 'task' })
           const { items: projects } = await apiClient.getItems({
             type: 'project',
             archived: false
           })
           const { items: ideas } = await apiClient.getItems({
             type: 'idea'
           })
           const unparsedCount = ideas.filter(i => !i.parsed).length

           // Build PlanWithEntities
           const planWithEntities = {
             ...plan,
             tasks: tasks.map(t => ({
               id: t.id,
               item_id: t.id,
               status: t.task?.status || 'pending',
               priority: t.task?.priority || 1,
               item: t
             }))
           }

           setEveningReviewData({
             plan: planWithEntities as PlanWithEntities,
             projects,
             unparsedCount
           })
           setShowEveningModal(true)
         }
       } catch (error) {
         // No finalized plan for today, ignore
       }
     }

     checkEveningFlow()
   }, [])
   ```

4. Import and render `EveningReviewFlow`:
   ```typescript
   import { EveningReviewFlow } from '@/components/EveningReviewFlow'

   // In render:
   {showEveningModal && eveningReviewData && (
     <EveningReviewFlow
       plan={eveningReviewData.plan}
       allProjects={eveningReviewData.projects}
       unparsedCount={eveningReviewData.unparsedCount}
       onClose={() => setShowEveningModal(false)}
       onComplete={handleEveningComplete}
     />
   )}
   ```

5. Create `handleEveningComplete` callback:
   ```typescript
   const handleEveningComplete = useCallback(async () => {
     setShowEveningModal(false)
     setEveningReviewData(null)

     // Optionally navigate to tomorrow's view
     const tomorrow = new Date()
     tomorrow.setDate(tomorrow.getDate() + 1)
     setSelectedDate(tomorrow.toISOString().split('T')[0])

     // Refresh planner data
     await fetchAssignments(selectedDate)

     // Show success toast
   }, [selectedDate, fetchAssignments])
   ```

6. Add manual "Evening Review" button in planner header:
   ```typescript
   {todayPlan?.status === 'finalized' && (
     <RetroButton
       onClick={async () => {
         await loadEveningReviewData()
         setShowEveningModal(true)
       }}
       variant="secondary"
       size="sm"
     >
       Evening Review
     </RetroButton>
   )}
   ```

7. Test the complete flow:
   - Mock system time to evening window
   - Have finalized plan for today
   - Navigate to planner, verify modal auto-shows
   - Step through all 6 wizard steps
   - Complete review
   - Verify plan status is 'completed'
   - Verify tomorrow's plan is created
   - Modal should not reappear on next mount

## Acceptance criteria

- Modal auto-triggers during evening window with finalized plan
- Manual button triggers modal outside window
- All 6 wizard steps functional (tasks, projects, journal, inbox, reschedule, tomorrow)
- Task completion toggles persist
- Project progress updates work
- Journal entry saves
- Incomplete task reschedule works
- Complete sets plan status='completed'
- Tomorrow's plan auto-created
- Planner refreshes after completion
- Modal doesn't appear for already-completed plans

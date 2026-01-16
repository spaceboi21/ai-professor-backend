# Frontend Fix Prompt for Student View Simulation

**Copy this entire prompt to Cursor on your frontend server:**

---

## ⚠️ CRITICAL ISSUE TO FIX

The simulation banner shows "SIMULATION MODE" but the **UI is still showing ADMIN interface** (Module Management). This is WRONG!

**What's happening:**
- Backend works correctly - simulation starts, student token is valid
- Frontend shows banner with wrong info ("Original Role: STUDENT" should be "SCHOOL_ADMIN")
- Frontend shows ADMIN UI instead of switching to STUDENT UI

**Root cause:** The frontend is NOT switching to a student interface when simulation mode starts.

---

## SOLUTION: Two Options

### Option A: Redirect to Student Frontend (RECOMMENDED)
When simulation starts, redirect the admin to the student frontend with the simulation token:
```
https://student.psysphereai.com/?token=<simulation_access_token>
```

### Option B: Switch UI Layout in Admin Frontend
The admin frontend needs to:
1. Detect when in simulation mode (check localStorage or token)
2. Render the STUDENT layout/components instead of admin components
3. Use the student's navigation, dashboard, modules view, etc.

---

## API Endpoints (Backend Working Correctly)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/simulation/students` | Get list of students for simulation |
| POST | `/api/simulation/start` | Start simulation (returns new token) |
| GET | `/api/simulation/status` | Check if in simulation mode |
| POST | `/api/simulation/end` | End simulation (returns original token) |
| POST | `/api/simulation/cleanup` | Cleanup stuck sessions |
| GET | `/api/simulation/history` | Get simulation history |

---

## Implementation Guide

### 1. Create Simulation Context/Store

```typescript
// contexts/SimulationContext.tsx or stores/simulationStore.ts

interface SimulationState {
  isSimulation: boolean;
  simulationSessionId: string | null;
  simulatedStudent: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  originalUserRole: string | null; // This is ADMIN/PROFESSOR, NOT STUDENT
  simulationMode: string | null;
}

// Load from localStorage on init
const getInitialState = (): SimulationState => {
  const stored = localStorage.getItem('simulation_state');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultState;
    }
  }
  return defaultState;
};

const defaultState: SimulationState = {
  isSimulation: false,
  simulationSessionId: null,
  simulatedStudent: null,
  originalUserRole: null,
  simulationMode: null,
};
```

### 2. Start Simulation Flow

```typescript
async function startSimulation(studentId: string, simulationMode: string = 'READ_ONLY_IMPERSONATION', purpose?: string) {
  try {
    // 1. CRITICAL: Store original tokens BEFORE the API call
    const originalTokens = {
      access_token: localStorage.getItem('access_token'),
      refresh_token: localStorage.getItem('refresh_token'),
    };
    localStorage.setItem('original_tokens', JSON.stringify(originalTokens));

    // 2. Get current user role before switching
    const currentUserRole = getCurrentUserRole(); // e.g., 'SCHOOL_ADMIN' or 'PROFESSOR'

    // 3. Call the start simulation API
    const response = await api.post('/simulation/start', {
      student_id: studentId,
      simulation_mode: simulationMode,
      purpose: purpose,
    });

    // 4. CRITICAL: Switch to simulation tokens
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);

    // 5. Save simulation state (THIS IS WHAT THE FRONTEND CHECKS)
    const simulationState: SimulationState = {
      isSimulation: true,
      simulationSessionId: response.data.simulation_session_id,
      simulatedStudent: response.data.simulated_student,
      originalUserRole: currentUserRole, // SCHOOL_ADMIN, not STUDENT!
      simulationMode: response.data.simulation_mode,
    };
    localStorage.setItem('simulation_state', JSON.stringify(simulationState));

    // 6. Update React/Vue state
    setSimulationState(simulationState);

    // 7. ⚠️ CRITICAL: Switch to STUDENT UI
    // OPTION A: Redirect to student frontend
    window.location.href = `https://student.psysphereai.com/?simulation=true`;
    
    // OPTION B: Redirect to student layout within same app
    // router.push('/student/dashboard');

    return response.data;
  } catch (error) {
    // Rollback: Restore original tokens if start fails
    const originalTokens = JSON.parse(localStorage.getItem('original_tokens') || '{}');
    if (originalTokens.access_token) {
      localStorage.setItem('access_token', originalTokens.access_token);
      localStorage.setItem('refresh_token', originalTokens.refresh_token);
    }
    localStorage.removeItem('original_tokens');
    localStorage.removeItem('simulation_state');
    throw error;
  }
}
```

### 3. End Simulation Flow

```typescript
async function endSimulation() {
  try {
    // 1. Call end simulation API
    const response = await api.post('/simulation/end');

    // 2. Use tokens from response (preferred)
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    } else {
      // 3. Fallback: Restore from stored original tokens
      const originalTokens = JSON.parse(localStorage.getItem('original_tokens') || '{}');
      if (originalTokens.access_token) {
        localStorage.setItem('access_token', originalTokens.access_token);
        localStorage.setItem('refresh_token', originalTokens.refresh_token);
      }
    }

    // 4. CRITICAL: Clear ALL simulation state
    localStorage.removeItem('original_tokens');
    localStorage.removeItem('simulation_state');

    // 5. Reset React/Vue state
    setSimulationState(defaultState);

    // 6. CRITICAL: Redirect back to ADMIN dashboard
    // OPTION A: If on student frontend, redirect to admin frontend
    window.location.href = 'https://school-admin.psysphereai.com/en/dashboard';
    
    // OPTION B: If in same app, switch layout
    // router.push('/admin/dashboard');

    return response.data;
  } catch (error) {
    // Even if API fails, force clear local state
    localStorage.removeItem('original_tokens');
    localStorage.removeItem('simulation_state');
    setSimulationState(defaultState);
    // Still redirect to admin dashboard
    window.location.href = 'https://school-admin.psysphereai.com/en/dashboard';
  }
}
```

### 4. App Initialization (Check Simulation State)

```typescript
// In your app initialization or main layout component
useEffect(() => {
  const initSimulation = () => {
    const storedState = localStorage.getItem('simulation_state');
    if (storedState) {
      try {
        const state = JSON.parse(storedState) as SimulationState;
        if (state.isSimulation) {
          setSimulationState(state);
          
          // ⚠️ CRITICAL: If on admin frontend but in simulation mode,
          // redirect to student UI
          if (window.location.hostname.includes('school-admin')) {
            window.location.href = 'https://student.psysphereai.com/dashboard';
            return;
          }
        }
      } catch {
        localStorage.removeItem('simulation_state');
      }
    }
  };

  initSimulation();
}, []);
```

### 5. Simulation Banner Component

```tsx
function SimulationBanner() {
  const { isSimulation, simulatedStudent, originalUserRole, endSimulation } = useSimulation();

  if (!isSimulation) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="animate-pulse">⚠️</span>
        <span className="font-bold">SIMULATION MODE</span>
        <span className="mx-2">•</span>
        <span>Viewing as: <strong>{simulatedStudent?.first_name} {simulatedStudent?.last_name}</strong></span>
        <span className="mx-2">•</span>
        <span>Your Role: <strong>{originalUserRole}</strong></span>
      </div>
      <button
        onClick={endSimulation}
        className="bg-white text-orange-500 px-4 py-1 rounded font-bold hover:bg-orange-100 flex items-center gap-2"
      >
        ✕ Exit Student View
      </button>
    </div>
  );
}
```

### 6. Layout Switch Based on Simulation Mode

```tsx
// layouts/MainLayout.tsx
function MainLayout({ children }) {
  const { isSimulation } = useSimulation();
  
  if (isSimulation) {
    // Render student layout with student navigation
    return (
      <StudentLayout>
        <SimulationBanner />
        {children}
      </StudentLayout>
    );
  }
  
  // Render admin layout with admin navigation
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}
```

### 7. "View as Student" Button on Admin Dashboard

```tsx
function ViewAsStudentButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStudents = async (search = '') => {
    const response = await api.get('/simulation/students', {
      params: { page: 1, limit: 10, search }
    });
    setStudents(response.data.data);
  };

  const handleStartSimulation = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      await startSimulation(selectedStudent.id, 'READ_ONLY_IMPERSONATION');
    } catch (error) {
      toast.error('Failed to start simulation: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setIsModalOpen(true); fetchStudents(); }}
        className="btn btn-secondary"
      >
        👁️ View as Student
      </button>

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <h2 className="text-xl font-bold mb-4">Select Student to Simulate</h2>
          <input
            type="search"
            placeholder="Search by name or email..."
            onChange={(e) => fetchStudents(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
          <div className="max-h-64 overflow-y-auto">
            {students.map(student => (
              <div
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`p-3 cursor-pointer border-b ${
                  selectedStudent?.id === student.id 
                    ? 'bg-blue-100 border-blue-500' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{student.first_name} {student.last_name}</div>
                <div className="text-sm text-gray-500">{student.email}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleStartSimulation}
              disabled={!selectedStudent || loading}
              className="btn btn-primary"
            >
              {loading ? 'Starting...' : 'Start Simulation'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
```

---

## ⚠️ Critical Rules

1. **MUST switch to STUDENT UI** when simulation starts - NOT just show a banner on admin UI
2. **MUST show correct "Original Role"** - It's SCHOOL_ADMIN or PROFESSOR, NOT STUDENT
3. **NEVER call `/simulation/end` on page load** - Only call it when user clicks "Exit"
4. **ALWAYS store original tokens BEFORE calling `/simulation/start`**
5. **ALWAYS clear simulation_state from localStorage when ending**
6. **Persist state in localStorage** so it survives page refreshes

---

## Files to Update

1. Create: `contexts/SimulationContext.tsx` or `stores/simulationStore.ts`
2. Create: `components/SimulationBanner.tsx`
3. Create/Update: `layouts/StudentLayout.tsx` - Student UI layout
4. Update: `layouts/MainLayout.tsx` - Switch between admin/student layouts
5. Update: Admin dashboard - Add "View as Student" button
6. Update: `api/axios.ts` - Read token from localStorage on each request

---

## Testing Checklist

- [ ] Admin clicks "View as Student" → sees list of students
- [ ] After starting simulation → UI switches to STUDENT interface (not admin)
- [ ] Banner shows correct info: student name + "Your Role: SCHOOL_ADMIN"
- [ ] All pages during simulation show student UI, not admin UI
- [ ] "Exit Student View" button returns to admin dashboard
- [ ] Page refresh during simulation stays in student view
- [ ] Write operations show "Read-only mode" error
- [ ] Can start new simulation after ending previous one

---

## Debugging

**If simulation is stuck:**
```javascript
// Run in browser console
localStorage.removeItem('simulation_state');
localStorage.removeItem('original_tokens');
location.reload();
```

**Force cleanup on backend:**
```javascript
fetch('https://api.psysphereai.com/api/simulation/cleanup', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log);
```

---

## Architecture Decision

The key decision you need to make:

**Option A: Cross-frontend redirect** (Recommended if you have separate student/admin frontends)
- Admin frontend redirects to student frontend with simulation token
- Student frontend checks for simulation token and stores it
- Exit button redirects back to admin frontend

**Option B: Single frontend with layout switching** (Simpler if admin can host student views)
- One frontend that can render both admin and student layouts
- Check `isSimulation` flag to decide which layout to show
- All student components must exist in the admin frontend

Choose based on your current architecture. The backend works with either approach.

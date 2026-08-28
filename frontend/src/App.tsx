import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WizardProvider } from './context/WizardContext'
import IntentPage        from './pages/IntentPage'
import SuitabilityPage   from './pages/SuitabilityPage'
import AuthorityPage     from './pages/AuthorityPage'
import DraftPage         from './pages/DraftPage'
import QualityCheckPage  from './pages/QualityCheckPage'
import ReadyToFilePage   from './pages/ReadyToFilePage'
import FilingRoutes      from './trackb/filing'

export default function App() {
  return (
    <BrowserRouter>
      <WizardProvider>
        <Routes>
          <Route path="/"              element={<IntentPage />} />
          <Route path="/suitability"   element={<SuitabilityPage />} />
          <Route path="/authority"     element={<AuthorityPage />} />
          <Route path="/draft"         element={<DraftPage />} />
          <Route path="/quality-check" element={<QualityCheckPage />} />
          <Route path="/ready-to-file" element={<ReadyToFilePage />} />
          <Route path="/filing/*"      element={<FilingRoutes />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </WizardProvider>
    </BrowserRouter>
  )
}

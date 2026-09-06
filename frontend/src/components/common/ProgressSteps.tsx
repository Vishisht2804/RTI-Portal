import { AppHeader } from './AppHeader'

/**
 * Kept for compatibility with pages that call <ProgressSteps currentStep={n} />.
 * The Figma design uses a breadcrumb (not a progress bar) as the location cue,
 * so this now just renders the shared header. Pages render <Breadcrumb /> themselves.
 */
export function ProgressSteps(_props: { currentStep?: number }) {
  return <AppHeader />
}

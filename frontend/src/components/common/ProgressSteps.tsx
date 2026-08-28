import { CheckIcon } from 'lucide-react'
import { WIZARD_STEPS } from '../../types/rti'

interface Props { currentStep: number }

export function ProgressSteps({ currentStep }: Props) {
  return (
    <div className="w-full bg-white border-b border-slate-100 shadow-sm">
      {/* Tricolour accent */}
      <div className="tricolour-bar" />

      {/* Logo bar */}
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-800 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-bold text-primary-900 text-lg tracking-tight">RTI Navigator</span>
          <span className="hidden sm:inline text-slate-400 text-xs ml-1">Powered by OpenAI</span>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Step {currentStep} of {WIZARD_STEPS.length}
        </span>
      </div>

      {/* Steps */}
      <div className="max-w-5xl mx-auto px-4 pb-4">
        <div className="flex items-center">
          {WIZARD_STEPS.map((step, idx) => {
            const done    = currentStep > step.id
            const active  = currentStep === step.id
            const future  = currentStep < step.id
            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                {/* Circle */}
                <div className="flex flex-col items-center min-w-[32px]">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                      ${done   ? 'bg-emerald-500 text-white shadow-md'           : ''}
                      ${active ? 'bg-primary-800 text-white shadow-md ring-4 ring-primary-100' : ''}
                      ${future ? 'bg-slate-200 text-slate-500'                  : ''}
                    `}
                  >
                    {done ? <CheckIcon size={14} /> : step.id}
                  </div>
                  <span
                    className={`mt-1 text-[10px] font-medium whitespace-nowrap leading-tight
                      ${active ? 'text-primary-700' : done ? 'text-emerald-600' : 'text-slate-400'}
                    `}
                  >
                    {step.label}
                  </span>
                </div>
                {/* Connector */}
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 rounded transition-all duration-300
                    ${currentStep > step.id ? 'bg-emerald-400' : 'bg-slate-200'}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

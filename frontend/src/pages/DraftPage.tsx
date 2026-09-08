import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowRightIcon, ArrowLeftIcon, RefreshCcwIcon,
  CopyIcon, CheckIcon, DownloadIcon, AlertCircleIcon,
} from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { AppFooter } from '../components/common/AppFooter'
import { Spinner } from '../components/common/Spinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { useWizard } from '../context/WizardContext'
import { generateDraft } from '../services/api'
import { isHindiStreetlightDemo } from '../services/demo/routing'

const CHAR_LIMIT = 3000

export default function DraftPage() {
  const navigate = useNavigate()
  const { state, setDraft, setEditedText } = useWizard()
  const intent    = state.intentResult
  const authority = state.selectedAuthority
  const isHindiDemo = isHindiStreetlightDemo(intent?.original_query ?? '')
  const [apiError, setApiError] = useState('')
  const [copied, setCopied]     = useState(false)

  const draftText = state.editedDraftText ?? state.draftResult?.draft_text ?? ''
  const charCount = draftText.length
  const overLimit = charCount > CHAR_LIMIT

  useEffect(() => { if (!intent || !authority) navigate('/') }, [intent, authority, navigate])

  const mutation = useMutation({
    mutationFn: generateDraft,
    onSuccess:  (data) => { setDraft(data); setApiError('') },
    onError:    (err: Error) => setApiError(err.message),
  })

  const doGenerate = () => {
    if (!intent || !authority) return
    mutation.mutate({
      original_query: intent.original_query,
      category:       intent.category,
      entities:       intent.entities,
      time_period:    intent.time_period,
      authority_id:   authority.authority_id,
      authority_name: authority.name,
      jurisdiction:   authority.jurisdiction,
    })
  }

  useEffect(() => {
    if (!state.draftResult) doGenerate()
  }, [])  // eslint-disable-line

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const handleDownload = () => {
    const blob = new Blob([draftText], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `RTI-request-${(authority?.name ?? 'draft').replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const charColor = overLimit
    ? 'text-red-600'
    : charCount > CHAR_LIMIT * 0.9
    ? 'text-amber-600'
    : 'text-slate-400'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps />

      <div className="page animate-slide-up">
        <Breadcrumb items={[
          { label: isHindiDemo ? 'होम' : 'Home', to: '/' }, { label: isHindiDemo ? 'प्राधिकरण' : 'Authority', to: '/authority' }, { label: isHindiDemo ? 'मसौदा' : 'Draft' },
        ]} />
        <h1 className="page-title">{isHindiDemo ? 'अपनी RTI का अनुरोध तैयार करें।' : 'Prepare your RTI request.'}</h1>
        <p className="page-subtitle max-w-2xl mb-8">
          {isHindiDemo ? 'हमने आपके प्रश्न को एक स्पष्ट अनुरोध में बदल दिया है। दाखिल करने से पहले भाषा की समीक्षा करें। यह अनुरोध ' : 'We turned your question into a clear request. Review the wording before moving to filing. It will be addressed to '}<span className="font-medium text-slate-700">{authority?.name}</span>{isHindiDemo ? ' को भेजा जाएगा।' : '.'}
        </p>

        {mutation.isPending && !state.draftResult && (
          <div className="panel flex justify-center py-16">
            <Spinner size="lg" label="Preparing your draft…" />
          </div>
        )}

        {apiError && !state.draftResult && (
          <ErrorMessage message={apiError} onRetry={doGenerate} />
        )}

        {state.draftResult && !mutation.isPending && (
          <div className="wizard-grid lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Document surface */}
            <div>
              <div className="panel overflow-hidden focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-colors">
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50">
                  <span className="eyebrow">{isHindiDemo ? 'RTI आवेदन का मसौदा' : 'RTI application draft'}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900">
                      {copied ? <><CheckIcon size={12} className="text-emerald-600" /> {isHindiDemo ? 'कॉपी हो गया' : 'Copied'}</> : <><CopyIcon size={12} /> {isHindiDemo ? 'कॉपी करें' : 'Copy'}</>}
                    </button>
                    <button onClick={handleDownload} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900">
                      <DownloadIcon size={12} /> {isHindiDemo ? 'डाउनलोड करें' : 'Download'}
                    </button>
                    <button onClick={doGenerate} disabled={mutation.isPending}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50">
                      <RefreshCcwIcon size={12} /> {isHindiDemo ? 'फिर बनाएं' : 'Regenerate'}
                    </button>
                  </div>
                </div>
                <textarea
                  className="w-full min-h-[520px] resize-y bg-white px-5 py-5 text-slate-800 text-[15px] leading-7
                             focus:outline-none"
                  value={draftText}
                  onChange={(e) => setEditedText(e.target.value)}
                  spellCheck
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${charColor}`}>
                  {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()} characters
                </span>
                {overLimit && (
                  <span className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircleIcon size={13} /> {isHindiDemo ? 'सीमा से अधिक है — आगे बढ़ने से पहले छोटा करें।' : 'Over the limit — shorten before continuing.'}
                  </span>
                )}
              </div>

              <button
                onClick={() => navigate('/quality-check')}
                disabled={!state.draftResult || overLimit || mutation.isPending}
                className="btn-primary w-full mt-6"
              >
                {isHindiDemo ? 'समीक्षा के लिए आगे बढ़ें' : 'Continue to review'}
              </button>
              <button
                onClick={() => navigate('/authority')}
                className="block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 mt-3"
              >
                ← {isHindiDemo ? 'प्राधिकरण बदलें' : 'Change authority'}
              </button>
              <p className="text-[13px] text-slate-400 mt-3 text-center">{isHindiDemo ? 'दाखिल करने से पहले आप मसौदे को संपादित कर सकते हैं।' : 'You can edit the draft before filing.'}</p>
            </div>

            {/* Context aside */}
            <aside className="lg:sticky lg:top-24">
              <div className="panel p-5">
                <h3 className="section-title">{isHindiDemo ? 'गुणवत्ता जांच' : 'Quality checks'}</h3>
                <ul className="mt-3 space-y-1.5">
                  {[
                    ...(isHindiDemo ? ['स्पष्ट रिकॉर्ड मांगा गया है', 'विशिष्ट अवधि शामिल है', 'सही प्राधिकरण चुना गया है', 'राय या स्पष्टीकरण नहीं मांगा गया है'] : ['Clear record requested', 'Specific period included', 'Correct authority selected', 'Avoids asking for opinion or explanation']),
                  ].map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckIcon size={14} className="text-emerald-600 shrink-0 mt-0.5" /> {c}
                    </li>
                  ))}
                </ul>
                <p className="text-[13px] text-slate-400 mt-3 divider pt-3">
                  {isHindiDemo ? 'अगले चरण में पूरी जांच की जाएगी।' : 'The full validation runs on the next step.'}
                </p>
              </div>

              {state.draftResult.explanation && (
                <div className="panel p-5 mt-4">
                  <p className="section-label mb-1.5">{isHindiDemo ? 'इस मसौदे के बारे में' : 'About this draft'}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{state.draftResult.explanation}</p>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  )
}

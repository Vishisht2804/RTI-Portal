import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { AppFooter } from '../components/common/AppFooter'
import { useWizard } from '../context/WizardContext'
import { CATEGORY_LABELS } from '../types/rti'
import { isHindiStreetlightDemo } from '../services/demo/routing'

export default function SuitabilityPage() {
  const navigate = useNavigate()
  const { state } = useWizard()
  const result = state.intentResult
  // branch: null = grievance screen | 'reframe' = reframing interstitial | 'rti' = RTI flow
  const [branch, setBranch] = useState<null | 'reframe' | 'rti'>(null)

  useEffect(() => { if (!result) navigate('/') }, [result, navigate])
  if (!result) return null

  const {
    is_rti_suitable, jurisdiction, category,
    suitability_explanation, reformulation_suggestion, grievance,
  } = result
  const isHindiDemo = isHindiStreetlightDemo(result.original_query)
  const isState = jurisdiction === 'state'

  // ── Grievance screen ─────────────────────────────────────────────────────
  if (grievance?.detected && branch === null) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <ProgressSteps />
        <div className="page animate-slide-up">
          <Breadcrumb items={[
            { label: isHindiDemo ? 'होम' : 'Home', to: '/' }, { label: isHindiDemo ? 'अनुरोध शुरू करें' : 'Start a request', to: '/' },
            { label: isHindiDemo ? 'उपयुक्तता' : 'Suitability' }, { label: isHindiDemo ? 'शिकायत' : 'Grievance' },
          ]} />
          <h1 className="page-title">{isHindiDemo ? 'यह RTI नहीं, बल्कि शिकायत का मामला लगता है।' : 'This looks like a grievance, not an RTI.'}</h1>
          <p className="page-subtitle max-w-2xl">
            {isHindiDemo ? 'आपकी समस्या किसी सरकारी रिकॉर्ड या सूचना को प्राप्त करने के बजाय किसी सार्वजनिक समस्या का समाधान करवाने से जुड़ी है। इसलिए इसके लिए RTI दाखिल करने के बजाय शिकायत दर्ज करना अधिक उपयुक्त है।' : 'Your goal appears to be getting a problem fixed rather than obtaining existing government records.'}
          </p>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] items-start mt-8">
            <div>
              <div className="panel p-6">
                <p className="eyebrow">{isHindiDemo ? 'शिकायत का रास्ता' : 'Grievance route'}</p>
                  <h2 className="section-title mt-2">{isHindiDemo ? 'समस्या का समाधान करवाएं' : 'Get the problem fixed'}</h2>
                <p className="text-[15px] text-slate-600 mt-3 leading-relaxed">
                  {isHindiDemo ? 'इस तरह की शिकायत के लिए संबंधित सरकारी शिकायत पोर्टल का उपयोग करें।' : grievance.fix_route_explanation}
                </p>
                <p className="text-[15px] text-slate-600 mt-3 leading-relaxed">{grievance.rti_reframe}</p>
                <p className="text-[13px] text-slate-400 mt-4">
                  {isHindiDemo ? 'RTI Navigator केवल मार्गदर्शन देता है। यह आपकी ओर से शिकायत दर्ज नहीं करता।' : 'RTI Navigator provides guidance only. It does not file grievances on your behalf.'}
                </p>
              </div>
              <button onClick={() => navigate('/')} className="text-sm font-medium text-slate-500 hover:text-slate-800 mt-4">
                ← {isHindiDemo ? 'वापस जाकर अपना अनुरोध बदलें' : 'Back and change my request'}
              </button>
            </div>

            <aside>
              <div className="panel p-6">
                <h3 className="section-title">{isHindiDemo ? 'सुझाया गया रास्ता' : 'Suggested route'}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {isHindiDemo ? 'संबंधित विभाग के सरकारी शिकायत चैनल का उपयोग करें। केंद्र सरकार CPGRAMS (pgportal.gov.in) चलाती है और अधिकांश राज्यों के अपने पोर्टल हैं।' : 'Use the appropriate public grievance channel for the department concerned. The Centre runs CPGRAMS (pgportal.gov.in) and most states run their own portals.'}
                </p>
              </div>
              {/* Primary: real external link to CPGRAMS */}
              <a
                href="https://pgportal.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="btn-primary w-full mt-4 block text-center"
              >
                {isHindiDemo ? 'समस्या का समाधान करवाएं →' : 'Get the problem fixed →'}
              </a>
              {/* Secondary: reframe as information request — does NOT go directly to authority */}
              <button
                onClick={() => setBranch('reframe')}
                className="block w-full text-center text-sm font-medium text-primary-800 hover:underline mt-3"
              >
                {isHindiDemo ? 'फिर भी RTI के साथ आगे बढ़ें' : 'Ask for information instead'}
              </button>
            </aside>
          </div>
        </div>
        <AppFooter />
      </div>
    )
  }

  // ── Reframing interstitial ────────────────────────────────────────────────
  if (grievance?.detected && branch === 'reframe') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <ProgressSteps />
        <div className="page animate-slide-up">
          <Breadcrumb items={[
            { label: isHindiDemo ? 'होम' : 'Home', to: '/' }, { label: isHindiDemo ? 'अनुरोध शुरू करें' : 'Start a request', to: '/' },
            { label: isHindiDemo ? 'उपयुक्तता' : 'Suitability' }, { label: isHindiDemo ? 'RTI के रूप में पूछें' : 'Reframe as RTI' },
          ]} />
          <h1 className="page-title">{isHindiDemo ? 'सूचना के अनुरोध के रूप में बदलें' : 'Reframing as an information request'}</h1>
          <p className="page-subtitle max-w-2xl">
            {isHindiDemo ? 'RTI किसी कार्रवाई के लिए बाध्य करने का साधन नहीं है — लेकिन इससे पता चल सकता है कि प्राधिकरण ने किसी समस्या के बारे में क्या दर्ज, मंजूर, खर्च या कार्रवाई की है।' : 'RTI is not a tool to compel action — but it can reveal what the authority has recorded, approved, spent, or done about a problem.'}
          </p>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] items-start mt-8">
            <div className="space-y-4">
              <div className="panel p-6">
                <p className="eyebrow">{isHindiDemo ? 'RTI के माध्यम से क्या पूछ सकते हैं' : 'What you can ask via RTI'}</p>
                <h2 className="section-title mt-2">{isHindiDemo ? 'कार्रवाई नहीं, रिकॉर्ड मांगें' : 'Ask for records, not action'}</h2>
                <p className="text-[15px] text-slate-600 mt-3 leading-relaxed">
                  {isHindiDemo ? 'यदि आपका उद्देश्य यह जानना है कि सरकार ने इस समस्या के बारे में क्या दर्ज, मंजूर, खर्च या कार्रवाई की है, तो आप RTI के रूप में आगे बढ़ सकते हैं। आवेदन प्राधिकरण से रिकॉर्ड मांगेगा — वह किसी समस्या को ठीक करने का आदेश नहीं दे सकता।' : 'If your goal is to know what the government has recorded, approved, spent, or done about this problem, you can continue as an RTI. The application will ask the authority for records — it cannot demand that they fix anything.'}
                </p>
              </div>

              {reformulation_suggestion && (
                <div className="panel p-6">
                  <p className="section-title">{isHindiDemo ? 'RTI के लिए सुझाई गई भाषा' : 'Suggested wording for an RTI'}</p>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{reformulation_suggestion}</p>
                </div>
              )}
            </div>

            <aside>
              <div className="panel p-6">
                <h3 className="section-title">{isHindiDemo ? 'महत्वपूर्ण अंतर' : 'Important distinction'}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {isHindiDemo ? 'RTI का उत्तर प्राधिकरण के रिकॉर्ड को सार्वजनिक रिकॉर्ड पर लाता है — इससे अक्सर कार्रवाई शुरू होती है — लेकिन RTI अधिनियम स्वयं केवल सूचना तक पहुंच देता है।' : "An RTI reply puts the authority's records on the public record — this often prompts action — but the RTI Act itself only gives you access to information."}
                </p>
              </div>
              <button
                onClick={() => setBranch('rti')}
                className="btn-primary w-full mt-4"
              >
                {isHindiDemo ? 'फिर भी RTI के साथ आगे बढ़ें' : 'Continue as RTI'}
              </button>
              <button
                onClick={() => setBranch(null)}
                className="block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 mt-3"
              >
                ← {isHindiDemo ? 'वापस' : 'Back'}
              </button>
            </aside>
          </div>
        </div>
        <AppFooter />
      </div>
    )
  }

  // ── Suitability verdict (branch === 'rti' means user explicitly reframed) ──
  const cameFromGrievance = grievance?.detected && branch === 'rti'
  const isSuitable = (is_rti_suitable || cameFromGrievance) && !isState

  const verdict = isSuitable
    ? { eyebrow: isHindiDemo ? 'RTI की उपयुक्तता' : 'RTI suitability', title: isHindiDemo ? 'हाँ — इसका उत्तर RTI के माध्यम से मिल सकता है।' : 'Yes — this can be answered through RTI.' }
    : isState
    ? { eyebrow: isHindiDemo ? 'राज्य का अधिकार क्षेत्र' : 'State jurisdiction', title: isHindiDemo ? 'यह राज्य सरकार के अधिकार क्षेत्र से संबंधित है।' : 'This concerns a state government authority.' }
    : { eyebrow: isHindiDemo ? 'RTI की उपयुक्तता' : 'RTI suitability', title: isHindiDemo ? 'इसका उत्तर RTI के माध्यम से मिलना संभव नहीं हो सकता।' : 'This may not be answerable through RTI.' }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps />
      <div className="page animate-slide-up">
        <Breadcrumb items={[
          { label: isHindiDemo ? 'होम' : 'Home', to: '/' },
          { label: isHindiDemo ? 'अनुरोध शुरू करें' : 'Start a request', to: '/' },
          { label: isHindiDemo ? 'उपयुक्तता' : 'Suitability' },
        ]} />
        <h1 className="page-title">{isHindiDemo ? 'क्या RTI सही रास्ता है?' : 'Is an RTI the right route?'}</h1>
        <p className="page-subtitle max-w-3xl">{isHindiDemo ? 'आपने पूछा: ' : 'You asked: '}{result.original_query}</p>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] items-start mt-8">
          <div>
            <div className="panel p-6">
              <p className="eyebrow">{verdict.eyebrow}</p>
              <h2 className="text-xl font-bold text-slate-900 mt-2">{verdict.title}</h2>
              <p className="text-[15px] text-slate-600 mt-3 leading-relaxed">
                {isHindiDemo
                  ? 'आपने इस समस्या से जुड़े रिकॉर्ड मांगने का विकल्प चुना है। अनुरोध को RTI के रूप में तैयार किया जाएगा, जिसमें प्राधिकरण द्वारा दर्ज की गई जानकारी और की गई कार्रवाई मांगी जाएगी।'
                  : cameFromGrievance
                  ? 'You chose to ask for records on this issue. The request will be prepared as an RTI for what the authority has recorded and done.'
                  : suitability_explanation}
              </p>
              {isSuitable && (
                <p className="text-sm font-semibold text-primary-800 mt-5">
                  {isHindiDemo ? 'अगला चरण: इन रिकॉर्डों को रखने वाले प्राधिकरण की पहचान करें →' : 'Next: identify the authority that holds these records →'}
                </p>
              )}
            </div>

            {isState && (
              <div className="panel p-6 mt-4">
                <p className="section-title">{isHindiDemo ? 'राज्य पोर्टल पर RTI दाखिल करें' : 'Filing a state RTI'}</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {isHindiDemo
                    ? 'यह अनुरोध राज्य प्राधिकरण से संबंधित है। इसे अपने राज्य के RTI पोर्टल या राज्य लोक सूचना अधिकारी के माध्यम से जमा करें।'
                    : "State RTIs are filed with your state's RTI portal or the State Public Information Officer. The request will still be prepared here — download it and submit through your state's channel."}
                </p>
              </div>
            )}

            {reformulation_suggestion && (!is_rti_suitable || cameFromGrievance) && (
              <div className="panel p-6 mt-4">
                <p className="section-title">{isHindiDemo ? 'सुझाई गई भाषा' : 'Suggested wording'}</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{reformulation_suggestion}</p>
              </div>
            )}

            <div className="mt-6">
              <p className="font-semibold text-slate-900">{isHindiDemo ? 'क्या आप किसी समस्या का समाधान करवाना चाहते हैं?' : 'Need something fixed instead?'}</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-lg">
                {isHindiDemo ? 'जब उद्देश्य जानकारी प्राप्त करने के बजाय किसी समस्या का समाधान करवाना हो, तो शिकायत का रास्ता चुनें।' : 'Choose the grievance path when the goal is to get a problem resolved rather than obtain information.'}
              </p>
            </div>
          </div>

          <aside>
            <div className="panel p-6">
              <h3 className="section-title">{isHindiDemo ? 'RTI किस काम के लिए है' : 'What RTI is for'}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {isHindiDemo ? 'RTI सार्वजनिक प्राधिकरणों के पास मौजूद रिकॉर्ड, दस्तावेज, आंकड़े, आदेश, रिपोर्ट और अन्य जानकारी प्राप्त करने के लिए उपयोगी है।' : 'RTI is useful for obtaining existing records, documents, figures, orders, reports, and other information held by public authorities.'}
              </p>
              <div className="divider mt-4 pt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="section-label">{isHindiDemo ? 'विषय' : 'Subject'}</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{isHindiDemo ? 'नागरिक सुविधाएं' : CATEGORY_LABELS[category]}</p>
                </div>
                <div>
                  <p className="section-label">{isHindiDemo ? 'स्तर' : 'Level'}</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">
                    {isHindiDemo ? 'राज्य' : jurisdiction === 'central' ? 'Central' : 'State'}
                  </p>
                </div>
              </div>
            </div>

            {isState ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {isHindiDemo
                  ? 'यह अनुरोध राज्य प्राधिकरण से संबंधित है और केंद्रीय RTI फाइलिंग प्रक्रिया में आगे नहीं बढ़ सकता। इसे अपने राज्य के RTI पोर्टल या राज्य लोक सूचना अधिकारी के पास जमा करें।'
                  : "This request concerns a state authority, so it cannot continue through the central RTI filing flow. Use your state's RTI portal or submit it to the State Public Information Officer."}
              </div>
            ) : (
              <button onClick={() => navigate('/authority')} className="btn-primary w-full mt-4">
                {isHindiDemo ? 'प्राधिकरण तक आगे बढ़ें' : isSuitable ? 'Continue to authority' : 'Continue anyway'}
              </button>
            )}
            {grievance?.detected ? (
              <button
                onClick={() => setBranch('reframe')}
                className="block w-full text-center text-sm font-medium text-primary-800 hover:underline mt-3"
              >
                ← {isHindiDemo ? 'पुनःफ्रेमिंग पर वापस जाएं' : 'Back to reframing'}
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 mt-3"
              >
                ← Change my request
              </button>
            )}
          </aside>
        </div>
      </div>
      <AppFooter />
    </div>
  )
}

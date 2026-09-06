/**
 * Track B — filing lifecycle screens.
 *
 * Uses Track A's design system (Tailwind + shared component classes).
 * No trackb.css — uses: card, btn-primary, btn-secondary, input-base, badge-*
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Link, Navigate, Route, Routes,
  useNavigate, useParams, useLocation,
} from "react-router-dom";
import {
  Check, CheckCircle2, Circle, CreditCard, FileText,
  LayoutDashboard, RefreshCw, Send, Upload, AlertCircle,
  ChevronRight, Clock, User, ArrowLeft, PlusCircle, SparklesIcon,
  Copy, Download, Edit3, FastForward, Shield,
} from "lucide-react";
import { AppHeader } from "../components/common/AppHeader";
import { SimulatedBanner } from "../components/common/SimulatedBanner";
import { DisclosureCard } from "../components/common/DisclosureCard";
import { DemoTimeControls } from "../components/common/DemoTimeControls";
import { DeadlineDisplay, DeadlineBadge } from "../components/common/DeadlineDisplay";
import { NextActionCard } from "../components/common/NextActionCard";
import { DEMO_MODE } from "../services/demo/config";
import { mockRequest, mockUploadDocument } from "../services/mockApi";
import { formatFriendlyDate } from "../utils/deadline";

const API_URL = "/api/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RtiDetail = {
  id: number;
  registration_number: string | null;
  authority_name: string;
  original_query: string;
  status: string;
  final_request: string;
  submitted_at: string | null;
  response_due_at: string | null;
  is_overdue: boolean;
  days_remaining: number | null;
  days_overdue_count: number;
  demo_now: string | null;
  applicant: { id: number; name: string; email: string; phone: string } | null;
  documents: { id: number; filename: string; size: number }[];
  status_events: { id: number; title: string; description: string; status: string }[];
  next_action: { title: string; description: string; action?: string; action_url?: string };
  first_appeal: {
    generated_at: string;
    title: string;
    reason: string;
    generated_text: string;
  } | null;
};

// ─── API helper ───────────────────────────────────────────────────────────────

export async function api(path: string, options: { method?: string; body?: unknown } = {}) {
  if (DEMO_MODE) {
    return mockRequest(path, options);
  }
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? "API request failed");
  return data;
}

// ─── Filing step config ───────────────────────────────────────────────────────

const FILING_STEPS = [
  { id: 1, key: "applicant", label: "Applicant" },
  { id: 2, key: "documents", label: "Documents" },
  { id: 3, key: "payment",   label: "Payment"   },
  { id: 4, key: "review",    label: "Review"    },
] as const;

type StepKey = typeof FILING_STEPS[number]["key"];

// ─── Human-readable status labels ────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  submitted:        "Submitted",
  payment_failed:   "Payment Failed",
  pending_payment:  "Awaiting Payment",
  draft:            "Draft",
  in_review:        "Under Review",
  applicant_pending:"Applicant Pending",
};

const STATUS_BADGE: Record<string, string> = {
  submitted:        "badge-green",
  payment_failed:   "badge-red",
  pending_payment:  "badge-orange",
  draft:            "badge-slate",
  in_review:        "badge-blue",
};

function humanStatus(raw: string) {
  return STATUS_LABEL[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Shared: RTI data hook ────────────────────────────────────────────────────

function useRti() {
  const { rtiId } = useParams();
  const [rti, setRti] = useState<RtiDetail | null>(null);
  const [error, setError] = useState("");

  async function load() {
    if (!rtiId) return;
    try { setRti(await api(`/rtis/${rtiId}`)); }
    catch (err) { setError(String(err)); }
  }

  useEffect(() => { load(); }, [rtiId]);
  return { rti, error, reload: load, rtiId: Number(rtiId) };
}

// ─── Shared: Filing stepper (clickable for completed steps) ───────────────────

function FilingStepper({ currentKey, rtiId }: { currentKey: StepKey; rtiId?: number }) {
  const currentIdx = FILING_STEPS.findIndex((s) => s.key === currentKey);
  const navigate = useNavigate();

  return (
    <div className="w-full bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-4 pt-3">
        <div className="flex items-center">
          {FILING_STEPS.map((step, idx) => {
            const done   = idx < currentIdx;
            const active = idx === currentIdx;
            const future = idx > currentIdx;

            const circle = (
              <div
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  done   ? "bg-emerald-500 text-white shadow-md" : "",
                  active ? "bg-primary-800 text-white shadow-md ring-4 ring-primary-100" : "",
                  future ? "bg-slate-200 text-slate-500" : "",
                ].join(" ")}
              >
                {done ? <Check size={14} /> : step.id}
              </div>
            );

            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center min-w-[32px]">
                  {/* Completed steps are clickable */}
                  {done && rtiId ? (
                    <button
                      onClick={() => navigate(`/filing/${rtiId}/${step.key}`)}
                      className="focus:outline-none cursor-pointer"
                      title={`Go back to ${step.label}`}
                    >
                      {circle}
                    </button>
                  ) : (
                    <div className={future ? "cursor-not-allowed" : ""}>{circle}</div>
                  )}
                  <span
                    className={[
                      "mt-1 text-[10px] font-medium whitespace-nowrap",
                      active ? "text-primary-700" : done ? "text-emerald-600" : "text-slate-400",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < FILING_STEPS.length - 1 && (
                  <div
                    className={[
                      "flex-1 h-0.5 mx-1 mb-4 rounded transition-all duration-300",
                      done ? "bg-emerald-400" : "bg-slate-200",
                    ].join(" ")}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Shared: Context info bar ─────────────────────────────────────────────────

function ContextBar({ rti }: { rti: RtiDetail | null }) {
  const badgeClass = STATUS_BADGE[rti?.status ?? ""] ?? "badge-slate";
  return (
    <div className="flex items-center flex-wrap gap-3 mb-6 pb-5 border-b border-slate-100">
      <div className="flex items-center gap-2 text-slate-600">
        <FileText size={16} className="text-primary-600 shrink-0" />
        <span className="font-semibold text-slate-800">{rti?.authority_name ?? "Loading…"}</span>
      </div>
      {rti?.status && (
        <span className={`badge ${badgeClass}`}>{humanStatus(rti.status)}</span>
      )}
      {rti?.registration_number && (
        <span className="badge badge-slate font-mono text-[11px]">{rti.registration_number}</span>
      )}
    </div>
  );
}

// ─── Shared: Page shell ───────────────────────────────────────────────────────

function PageShell({
  eyebrow, title, stepKey, rtiId, children,
}: {
  eyebrow: string;
  title: string;
  stepKey?: StepKey;
  rtiId?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />
      {stepKey && <FilingStepper currentKey={stepKey} rtiId={rtiId} />}

      <div className="max-w-4xl w-full mx-auto px-6 lg:px-8 py-10 animate-slide-up">
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{eyebrow}</p>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Bottom nav helper ────────────────────────────────────────────────────────

function BottomNav({
  backLabel, backTo,
  forwardLabel, onForward, forwardDisabled, forwardIcon,
}: {
  backLabel: string;
  backTo: string;
  forwardLabel: string;
  onForward: () => void;
  forwardDisabled?: boolean;
  forwardIcon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
      <Link to={backTo} className="btn-secondary flex items-center gap-2">
        <ArrowLeft size={15} /> {backLabel}
      </Link>
      <button
        onClick={onForward}
        disabled={forwardDisabled}
        className="btn-primary flex items-center gap-2"
      >
        {forwardIcon ?? null}
        {forwardLabel}
        {!forwardIcon && <ChevronRight size={16} />}
      </button>
    </div>
  );
}

// ─── Applicant ─────────────────────────────────────────────────────────────────

function Applicant() {
  const { rti, error, rtiId } = useRti();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "Demo Applicant", email: "demo@example.com", phone: "9999999999" });
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [actionError, setActionError] = useState("");
  const healing = React.useRef(false);

  // Self-heal: if this RTI has already been filed (e.g. "File another" / "Jump
  // to filing" landed on the completed demo RTI), spin up a fresh Ready-to-File
  // RTI and redirect — so the flow never dead-ends without a Demo reset.
  useEffect(() => {
    if (!DEMO_MODE || !rti || healing.current) return;
    if (rti.status !== "READY_TO_FILE") {
      healing.current = true;
      api("/demo/rti", { method: "POST" })
        .then((r) => navigate(`/filing/${r.rti_id}/applicant`, { replace: true }))
        .catch(() => { healing.current = false; });
    }
  }, [rti, navigate]);

  async function sendOtp() {
    setActionError("");
    setLoading(true);
    try {
      await api(`/rtis/${rtiId}/applicant`, { method: "POST", body: form });
      const r = await api(`/rtis/${rtiId}/otp/send`, { method: "POST" });
      setOtpMessage(r.message);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function verify() {
    setActionError("");
    setVerifying(true);
    try {
      await api(`/rtis/${rtiId}/otp/verify`, { method: "POST", body: { otp } });
      navigate(`/filing/${rtiId}/documents`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally { setVerifying(false); }
  }

  return (
    <PageShell eyebrow="Filing · Step 1 of 4" title="Applicant Details" stepKey="applicant" rtiId={rtiId}>
      <div className="card mb-4">
        <ContextBar rti={rti} />

        <SimulatedBanner>
          Demo OTP: <span className="font-mono">123456</span> — enter it below. No SMS is sent.
        </SimulatedBanner>

        {(error || actionError) && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2 mb-4">
            <AlertCircle size={15} /> {actionError || error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {(["name", "email", "phone"] as const).map((key) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 capitalize">
                {key}
              </label>
              <input
                className="input-base"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={key}
              />
            </div>
          ))}
        </div>

        <button onClick={sendOtp} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? "Sending…" : <><User size={15} /> Send demo OTP</>}
        </button>

        {otpMessage && (
          <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            {otpMessage}
          </p>
        )}
      </div>

      {otpMessage && (
        <div className="card mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Enter OTP
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="input-base w-40 font-mono tracking-widest text-center text-lg"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
            />
            <button onClick={verify} disabled={verifying || !otp} className="btn-primary flex items-center gap-2">
              {verifying ? "Verifying…" : <><CheckCircle2 size={15} /> Verify OTP</>}
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav — OTP send/verify lives in the form above, not duplicated here */}
      <div className="flex items-center mt-6 pt-4 border-t border-slate-100">
        <Link to="/filing/dashboard" className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <span className="ml-auto text-xs text-slate-400">
          Verify the OTP to continue to Documents
        </span>
      </div>
    </PageShell>
  );
}

// ─── Documents ─────────────────────────────────────────────────────────────────

function Documents() {
  const { rti, rtiId, reload } = useRti();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);

  async function upload() {
    setUploading(true);
    try {
      const blob = new Blob(["demo proof"], { type: "application/pdf" });
      const form = new FormData();
      form.append("rti_id", String(rtiId));
      form.append("file", blob, "supporting-document.pdf");
      if (DEMO_MODE) {
        await mockUploadDocument(form);
      } else {
        await fetch(`${API_URL}/documents`, { method: "POST", body: form });
      }
      await reload();
    } finally { setUploading(false); }
  }

  const docs = rti?.documents ?? [];

  return (
    <PageShell eyebrow="Filing · Step 2 of 4" title="Documents" stepKey="documents" rtiId={rtiId}>
      <div className="card mb-4">
        <ContextBar rti={rti} />

        <p className="text-sm text-slate-500 mb-5">
          Upload supporting documents for your RTI application. You can proceed without documents.
        </p>

        <button onClick={upload} disabled={uploading} className="btn-primary flex items-center gap-2">
          {uploading ? "Uploading…" : <><Upload size={15} /> Add demo document</>}
        </button>

        {docs.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Uploaded</p>
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3"
              >
                <FileText size={15} className="text-primary-600 shrink-0" />
                <span className="text-sm text-slate-700 font-medium flex-1">{d.filename}</span>
                <span className="text-xs text-slate-400">{(d.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav
        backLabel="Applicant"
        backTo={`/filing/${rtiId}/applicant`}
        forwardLabel="Continue"
        onForward={() => navigate(`/filing/${rtiId}/payment`)}
      />
    </PageShell>
  );
}

// ─── Payment ──────────────────────────────────────────────────────────────────

function Payment() {
  const { rti, rtiId, reload } = useRti();
  const navigate = useNavigate();
  const [paying, setPaying] = useState<"SUCCESS" | "FAILED" | null>(null);

  async function pay(force_result: "SUCCESS" | "FAILED") {
    setPaying(force_result);
    try {
      await api(`/rtis/${rtiId}/payment`, { method: "POST", body: { force_result } });
      await reload();
      if (force_result === "SUCCESS") navigate(`/filing/${rtiId}/review`);
    } finally { setPaying(null); }
  }

  return (
    <PageShell eyebrow="Filing · Step 3 of 4" title="Payment" stepKey="payment" rtiId={rtiId}>
      <div className="card mb-4">
        <ContextBar rti={rti} />

        <SimulatedBanner>
          ₹10 application fee — the buttons below just set a status. No payment provider is called.
        </SimulatedBanner>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 mb-6 text-center">
          <CreditCard size={32} className="text-primary-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">₹ 10.00</p>
          <p className="text-sm text-slate-500 mt-1">RTI Application Fee</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => pay("SUCCESS")}
            disabled={paying !== null}
            className="btn-primary flex items-center gap-2"
          >
            <CreditCard size={15} />
            {paying === "SUCCESS" ? "Processing…" : "Mark payment success"}
          </button>
          <button
            onClick={() => pay("FAILED")}
            disabled={paying !== null}
            className="btn-secondary flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
          >
            {paying === "FAILED" ? "Processing…" : "Simulate failure"}
          </button>
        </div>
      </div>

      <BottomNav
        backLabel="Documents"
        backTo={`/filing/${rtiId}/documents`}
        forwardLabel="Continue"
        onForward={() => navigate(`/filing/${rtiId}/review`)}
      />
    </PageShell>
  );
}

// ─── Review ───────────────────────────────────────────────────────────────────

function Review() {
  const { rti, rtiId } = useRti();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await api(`/rtis/${rtiId}/submit`, { method: "POST" });
      navigate(`/filing/${rtiId}/submitted`);
    } finally { setSubmitting(false); }
  }

  return (
    <PageShell eyebrow="Filing · Step 4 of 4" title="Review & Submit" stepKey="review" rtiId={rtiId}>
      <div className="card mb-4">
        <ContextBar rti={rti} />

        <SimulatedBanner>
          “Submit RTI” generates a demo registration number. Nothing is filed with a real
          Public Information Officer or rtionline.gov.in.
        </SimulatedBanner>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Final RTI Request
        </p>
        <div className="bg-slate-50 border-l-4 border-primary-600 rounded-lg p-4 mb-2">
          <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
            {rti?.final_request ?? "Loading…"}
          </pre>
        </div>
      </div>

      <BottomNav
        backLabel="Payment"
        backTo={`/filing/${rtiId}/payment`}
        forwardLabel={submitting ? "Submitting…" : "Submit RTI"}
        onForward={submit}
        forwardDisabled={submitting || !rti}
        forwardIcon={<Send size={15} />}
      />
    </PageShell>
  );
}

// ─── Submitted ────────────────────────────────────────────────────────────────

function Submitted() {
  const { rti } = useRti();

  return (
    <PageShell eyebrow="Confirmation" title="Submission Recorded">
      <SimulatedBanner>
        The registration number below is generated locally for the demo. No RTI was filed
        with any government system.
      </SimulatedBanner>

      <div className="card text-center mb-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-2">RTI Submitted!</h2>

        <p className="text-sm text-slate-500 mb-6">
          This is a simulated government submission for the hackathon MVP.
        </p>

        {rti?.registration_number ? (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 inline-block mx-auto">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Registration Number</p>
            <p className="text-2xl font-bold text-primary-800 font-mono">{rti.registration_number}</p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-400 italic">Registration pending…</p>
          </div>
        )}

        {rti?.response_due_at && (
          <div className="mt-2 mb-6 text-left max-w-sm mx-auto">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Response Protection
            </p>
            <DeadlineDisplay
              responseDueAt={rti.response_due_at}
              isOverdue={rti.is_overdue}
              daysRemaining={rti.days_remaining}
              daysOverdueCount={rti.days_overdue_count}
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/filing/dashboard" className="btn-primary flex items-center justify-center gap-2">
            <LayoutDashboard size={15} /> Go to Dashboard
          </Link>
          <Link to="/" className="btn-secondary flex items-center justify-center gap-2">
            File Another RTI
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const [rtis, setRtis] = useState<any[]>([]);
  const [demoNow, setDemoNow] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [fastforwarding, setFastforwarding] = useState(false);
  const navigate = useNavigate();

  async function loadAll() {
    const [list, time] = await Promise.all([
      api("/rtis").catch(() => []),
      DEMO_MODE ? api("/demo/time").catch(() => ({ demo_now: null })) : Promise.resolve({ demo_now: null }),
    ]);
    setRtis(list);
    setDemoNow(time?.demo_now ?? null);
  }

  useEffect(() => { loadAll(); }, []);

  async function reset() {
    setResetting(true);
    try {
      await api("/demo/reset", { method: "POST" });
      await loadAll();
    } finally { setResetting(false); }
  }

  async function jumpToFiling() {
    const ready = rtis.find((r) => r.status === "READY_TO_FILE");
    if (ready) { navigate(`/filing/${ready.id}/applicant`); return; }
    if (DEMO_MODE) {
      try {
        const r = await api("/demo/rti", { method: "POST" });
        navigate(`/filing/${r.rti_id}/applicant`);
        return;
      } catch { /* fall through */ }
    }
    navigate(`/filing/${rtis[0]?.id ?? 1}/applicant`);
  }

  async function advanceTime(days: number) {
    await api("/demo/time/advance", { method: "POST", body: { days } });
  }

  async function resetTime() {
    await api("/demo/time/reset", { method: "POST" });
  }

  async function runFastForwardDemo() {
    setFastforwarding(true);
    try {
      // Fast-forward to 3 days past the first submitted RTI's deadline
      await api("/demo/time/fastforward", { method: "POST" });
      await loadAll();
      // Navigate to the first overdue RTI if any
      const fresh = await api("/rtis").catch(() => []);
      const overdue = fresh.find((r: any) => r.is_overdue);
      if (overdue) navigate(`/filing/rtis/${overdue.id}`);
    } finally { setFastforwarding(false); }
  }

  // Partition RTIs by urgency
  const overdueRtis = rtis.filter((r) => r.is_overdue && r.status === "AWAITING_RESPONSE");
  const awaitingRtis = rtis.filter((r) => !r.is_overdue && r.status === "AWAITING_RESPONSE");
  const activeRtis = rtis.filter(
    (r) => r.status !== "AWAITING_RESPONSE" && r.status !== "RESPONSE_RECEIVED",
  );
  const doneRtis = rtis.filter((r) => r.status === "RESPONSE_RECEIVED");
  const attentionCount = overdueRtis.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />

      <div className="max-w-6xl w-full mx-auto px-6 lg:px-8 py-10 animate-slide-up">

        {/* Heading row */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Citizen RTIs</p>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            {DEMO_MODE && (
              <DemoTimeControls
                demoNow={demoNow}
                onTimeChange={loadAll}
                onAdvance={advanceTime}
                onReset={resetTime}
                compact
              />
            )}
            <button
              onClick={reset}
              disabled={resetting}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <RefreshCw size={11} className={resetting ? "animate-spin" : ""} />
              {resetting ? "Resetting…" : "Demo reset"}
            </button>
          </div>
        </div>

        {/* ── ATTENTION REQUIRED ─────────────────────────────────────────── */}
        {attentionCount > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{attentionCount}</span>
              </div>
              <p className="text-sm font-bold text-red-700 uppercase tracking-wider">
                {attentionCount} action{attentionCount !== 1 ? "s" : ""} required
              </p>
            </div>
            <div className="space-y-3">
              {overdueRtis.map((rti) => (
                <div
                  key={rti.id}
                  className="card border-2 border-red-200 bg-red-50 hover:border-red-300 cursor-pointer transition-all duration-200 active:scale-[0.99]"
                  onClick={() => navigate(`/filing/rtis/${rti.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="badge badge-red">Overdue</span>
                        {rti.registration_number && (
                          <span className="badge badge-slate font-mono text-[10px]">{rti.registration_number}</span>
                        )}
                        <DeadlineBadge
                          isOverdue={rti.is_overdue}
                          daysRemaining={rti.days_remaining}
                          daysOverdueCount={rti.days_overdue_count}
                        />
                      </div>
                      <p className="font-semibold text-slate-800 mb-0.5 truncate">{rti.authority_name}</p>
                      {rti.subject && (
                        <p className="text-sm text-slate-500 line-clamp-1 mb-2">{rti.subject}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-red-700 font-semibold">
                        <FileText size={11} />
                        Generate First Appeal →
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-red-300 shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Primary CTA ───────────────────────────────────────────────── */}
        <div className="card mb-6 bg-gradient-to-br from-primary-800 to-primary-700 border-primary-700 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-1">Start here</p>
            <h2 className="text-xl font-bold mb-1">File a New RTI</h2>
            <p className="text-blue-100 text-sm leading-relaxed max-w-md">
              Describe what you need and RTI Navigator prepares the application — then tracks the response deadline.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-white text-primary-800 font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              Start New RTI <ChevronRight size={16} />
            </Link>
            <button
              onClick={jumpToFiling}
              className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
            >
              Jump to filing <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* ── Response Protection demo shortcut ─────────────────────────── */}
        {DEMO_MODE && (
          <div className="card mb-6 border-violet-200 bg-violet-50">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                <Shield size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-0.5">
                  Response Protection — Demo
                </p>
                <p className="text-sm font-semibold text-slate-800 mb-0.5">
                  See what happens when there is no response
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Fast-forward the demo clock past the 30-day deadline to experience RTI Navigator's
                  overdue detection and First Appeal generation.
                </p>
                <button
                  onClick={runFastForwardDemo}
                  disabled={fastforwarding}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  <FastForward size={14} />
                  {fastforwarding ? "Fast-forwarding…" : "Run 30-day demo"}
                </button>
              </div>
            </div>
          </div>
        )}

        <DisclosureCard />

        {/* ── Awaiting response ─────────────────────────────────────────── */}
        {awaitingRtis.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Awaiting Response</p>
            <div className="space-y-3">
              {awaitingRtis.map((rti) => (
                <RtiCard key={rti.id} rti={rti} onClick={() => navigate(`/filing/rtis/${rti.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Active (filing in progress) ───────────────────────────────── */}
        {activeRtis.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">In Progress</p>
            <div className="space-y-3">
              {activeRtis.map((rti) => (
                <RtiCard key={rti.id} rti={rti} onClick={() => navigate(`/filing/rtis/${rti.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Done ─────────────────────────────────────────────────────── */}
        {doneRtis.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Completed</p>
            <div className="space-y-3">
              {doneRtis.map((rti) => (
                <RtiCard key={rti.id} rti={rti} onClick={() => navigate(`/filing/rtis/${rti.id}`)} />
              ))}
            </div>
          </div>
        )}

        {rtis.length === 0 && (
          <div className="card text-center py-12">
            <FileText size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No RTIs yet</p>
            <p className="text-sm text-slate-400 mt-1 mb-5">File your first RTI using the button above</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard RTI card ───────────────────────────────────────────────────────

function RtiCard({ rti, onClick }: { rti: any; onClick: () => void }) {
  const badgeClass = STATUS_BADGE[rti.status] ?? "badge-slate";
  return (
    <div
      onClick={onClick}
      className="card hover:shadow-md hover:border-primary-100 cursor-pointer transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex items-start gap-2 mb-2">
        <span className={`badge ${badgeClass}`}>{humanStatus(rti.status ?? "draft")}</span>
        {rti.registration_number && (
          <span className="badge badge-slate font-mono text-[10px]">{rti.registration_number}</span>
        )}
        {rti.days_remaining !== null && (
          <DeadlineBadge
            isOverdue={rti.is_overdue}
            daysRemaining={rti.days_remaining}
            daysOverdueCount={rti.days_overdue_count}
          />
        )}
        <ChevronRight size={14} className="text-slate-300 ml-auto shrink-0" />
      </div>
      <p className="font-semibold text-slate-800 mb-0.5">{rti.authority_name}</p>
      {rti.subject && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-2">{rti.subject}</p>
      )}
      {rti.next_action?.title && (
        <div className="flex items-center gap-1.5 text-xs text-primary-600 font-medium mt-1">
          <Clock size={11} />
          Next: {rti.next_action.title}
        </div>
      )}
    </div>
  );
}

// ─── RTI Detail ────────────────────────────────────────────────────────────────

function Detail() {
  const { rti, reload, rtiId } = useRti();
  const timeline = useMemo(() => rti?.status_events ?? [], [rti]);
  const [demoNow, setDemoNow] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [appealText, setAppealText] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (rti?.first_appeal?.generated_text) {
      setAppealText(rti.first_appeal.generated_text);
    }
  }, [rti?.first_appeal?.generated_text]);

  useEffect(() => {
    if (DEMO_MODE) {
      api("/demo/time")
        .then((r) => setDemoNow(r?.demo_now ?? null))
        .catch(() => {});
    }
  }, []);

  async function advanceTime(days: number) {
    await api("/demo/time/advance", { method: "POST", body: { days } });
  }

  async function resetTime() {
    await api("/demo/time/reset", { method: "POST" });
  }

  async function handleTimeChange() {
    const r = await api("/demo/time").catch(() => ({ demo_now: null }));
    setDemoNow(r?.demo_now ?? null);
    await reload();
  }

  async function generateAppeal() {
    setGenerateError("");
    setGenerating(true);
    try {
      const r = await api(`/rtis/${rtiId}/appeal/generate`, { method: "POST" });
      setAppealText(r.first_appeal.generated_text);
      await reload();
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function saveAppeal() {
    setSaving(true);
    try {
      await api(`/rtis/${rtiId}/appeal`, {
        method: "PATCH",
        body: { generated_text: appealText },
      });
      await reload();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyAppeal() {
    try {
      await navigator.clipboard.writeText(appealText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access may be unavailable in some browser contexts.
    }
  }

  function downloadAppeal() {
    const blob = new Blob([appealText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const regNum = rti?.registration_number?.replace(/\//g, "-") ?? "rti";
    a.download = `first-appeal-${regNum}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const isAwaitingResponse = rti?.status === "AWAITING_RESPONSE";
  const hasAppeal = Boolean(rti?.first_appeal);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />

      <div className="max-w-7xl w-full mx-auto px-6 lg:px-8 py-10 animate-slide-up">
        <Link
          to="/filing/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
              {rti?.registration_number ?? "Case detail"}
            </p>
            <h1 className="text-2xl font-bold text-slate-800">RTI Details</h1>
          </div>
          {DEMO_MODE && (
            <DemoTimeControls
              demoNow={demoNow}
              onTimeChange={handleTimeChange}
              onAdvance={advanceTime}
              onReset={resetTime}
              compact
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-4">
            <div className="card">
              <ContextBar rti={rti} />

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Final Request
              </p>
              <div className="bg-slate-50 border-l-4 border-primary-600 rounded-lg p-4 mb-5">
                <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
                  {rti?.final_request ?? "Loading…"}
                </pre>
              </div>

              {isAwaitingResponse && rti?.response_due_at && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Response Deadline
                  </p>
                  <DeadlineDisplay
                    responseDueAt={rti.response_due_at}
                    isOverdue={rti.is_overdue}
                    daysRemaining={rti.days_remaining}
                    daysOverdueCount={rti.days_overdue_count}
                  />
                </div>
              )}

              {rti?.next_action && (
                <>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Next Action
                  </p>

                  {hasAppeal ? (
                    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <p className="text-sm font-bold text-emerald-800">First Appeal ready to file</p>
                      </div>
                      <p className="text-sm text-emerald-700">
                        Review, edit, copy, or download the generated First Appeal draft below.
                      </p>
                    </div>
                  ) : (
                    <NextActionCard
                      nextAction={rti.next_action}
                      isOverdue={rti.is_overdue}
                      daysRemaining={rti.days_remaining}
                      daysOverdueCount={rti.days_overdue_count}
                      onGenerateAppeal={
                        rti.is_overdue ? generateAppeal : undefined
                      }
                      generating={generating}
                    />
                  )}

                  {generateError && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={12} /> {generateError}
                    </p>
                  )}
                </>
              )}
            </div>

            {hasAppeal && rti?.first_appeal && (
              <div className="card border-2 border-emerald-200 bg-emerald-50">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-0.5">
                      First Appeal — Ready
                    </p>
                    <p className="text-base font-bold text-slate-800">{rti.first_appeal.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{rti.first_appeal.reason}</p>
                  </div>
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-1" />
                </div>

                {rti.submitted_at && (
                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                      <p className="text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Filed</p>
                      <p className="text-slate-700 font-medium">{formatFriendlyDate(rti.submitted_at)}</p>
                    </div>
                    {rti.response_due_at && (
                      <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                        <p className="text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Due</p>
                        <p className="text-slate-700 font-medium">{formatFriendlyDate(rti.response_due_at)}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Appeal Text
                    </p>
                    {!editing && (
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                    )}
                  </div>

                  <textarea
                    value={appealText}
                    onChange={(e) => setAppealText(e.target.value)}
                    readOnly={!editing}
                    rows={16}
                    className={[
                      "w-full text-xs font-mono leading-relaxed p-3 rounded-xl border resize-y transition-colors",
                      editing
                        ? "border-primary-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
                        : "border-slate-200 bg-slate-50 text-slate-700 cursor-default",
                    ].join(" ")}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {editing ? (
                    <>
                      <button
                        onClick={saveAppeal}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                      >
                        {saving ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false);
                          setAppealText(rti.first_appeal!.generated_text);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={copyAppeal}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Copy size={13} /> {copied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={downloadAppeal}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Download size={13} /> Download .txt
                      </button>
                    </>
                  )}
                </div>

                <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
                  Prototype: Review all fields and verify the First Appellate Authority's address before filing.
                </p>
              </div>
            )}

            {!isAwaitingResponse && rti?.submitted_at && (
              <div className="card">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Filing Dates
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Submitted</p>
                    <p className="font-medium text-slate-700">{formatFriendlyDate(rti.submitted_at)}</p>
                  </div>
                  {rti.response_due_at && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Response due</p>
                      <p className="font-medium text-slate-700">{formatFriendlyDate(rti.response_due_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {rti?.documents && rti.documents.length > 0 && (
              <div className="card">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Documents
                </p>
                <div className="space-y-2">
                  {rti.documents.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3"
                    >
                      <FileText size={15} className="text-primary-600 shrink-0" />
                      <span className="text-sm text-slate-700 font-medium flex-1">{d.filename}</span>
                      <span className="text-xs text-slate-400">{(d.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card h-fit">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
              Status Timeline
            </p>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No events yet.</p>
            ) : (
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-5">
                {timeline.map((event) => (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-[25px] w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mb-0.5">{event.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{event.description}</p>
                    {event.status && (
                      <span className="badge badge-blue mt-1.5 capitalize text-[10px]">
                        {humanStatus(event.status)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Routes ────────────────────────────────────────────────────────────────────

export default function FilingRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/filing/dashboard" replace />} />
      <Route path="dashboard"         element={<Dashboard />} />
      <Route path="rtis/:rtiId"       element={<Detail />} />
      <Route path=":rtiId/applicant"  element={<Applicant />} />
      <Route path=":rtiId/documents"  element={<Documents />} />
      <Route path=":rtiId/payment"    element={<Payment />} />
      <Route path=":rtiId/review"     element={<Review />} />
      <Route path=":rtiId/submitted"  element={<Submitted />} />
    </Routes>
  );
}

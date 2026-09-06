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
import { AlertCircle, Copy, Download, FileText, RefreshCw, Send } from "lucide-react";
import { AppHeader } from "../components/common/AppHeader";
import { AppFooter } from "../components/common/AppFooter";
import { Breadcrumb } from "../components/common/Breadcrumb";
import { DisclosureCard } from "../components/common/DisclosureCard";
import { DemoTimeControls } from "../components/common/DemoTimeControls";

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
    submitted_at: string | null;
    appeal_reference_number: string | null;
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

// ─── Shared: filing step strip (Figma: "1 Applicant · 2 Documents · …") ───────

const FILING_PHASES = [
  { key: "applicant", label: "Applicant" },
  { key: "documents", label: "Documents" },
  { key: "payment",   label: "Payment" },
  { key: "review",    label: "Review" },
  { key: "submitted", label: "Submit" },
] as const;

function StepStrip({ current }: { current: string }) {
  const idx = FILING_PHASES.findIndex((p) => p.key === current);
  return (
    <p className="text-sm mt-3 mb-8 flex flex-wrap gap-x-2 gap-y-1">
      {FILING_PHASES.map((p, i) => (
        <span key={p.key} className="flex items-center gap-2">
          {i > 0 && <span className="text-slate-300" aria-hidden>·</span>}
          <span className={
            i === idx ? "font-semibold text-slate-900"
            : i < idx ? "text-slate-500"
            : "text-slate-400"
          }>
            {i + 1} {p.label}
          </span>
        </span>
      ))}
    </p>
  );
}

// ─── Shared: Page shell ───────────────────────────────────────────────────────

function PageShell({
  crumbs, title, subtitle, stepKey, children,
}: {
  crumbs: { label: string; to?: string }[];
  title: string;
  subtitle?: string;
  stepKey?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />
      <div className="page animate-slide-up">
        <Breadcrumb items={crumbs} />
        <h1 className="page-title">{title}</h1>
        {stepKey && <StepStrip current={stepKey} />}
        {subtitle && <p className="page-subtitle max-w-2xl mb-8">{subtitle}</p>}
        {children}
      </div>
      <AppFooter />
    </div>
  );
}

// ─── Bottom nav helper ────────────────────────────────────────────────────────

function BottomNav({
  backLabel, backTo,
  forwardLabel, onForward, forwardDisabled,
}: {
  backLabel: string;
  backTo: string;
  forwardLabel: string;
  onForward: () => void;
  forwardDisabled?: boolean;
  forwardIcon?: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <button
        onClick={onForward}
        disabled={forwardDisabled}
        className="btn-primary w-full sm:w-auto sm:min-w-[220px]"
      >
        {forwardLabel}
      </button>
      <Link
        to={backTo}
        className="block sm:inline-block sm:ml-5 mt-3 sm:mt-0 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        ← {backLabel}
      </Link>
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
    <PageShell
      crumbs={[{ label: "My RTIs", to: "/filing/dashboard" }, { label: "File" }, { label: "Applicant" }]}
      title="Applicant details"
      subtitle="Add your details and complete the simulated verification. Nothing is sent."
      stepKey="applicant"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div>
          <div className="panel p-6">
            <p className="eyebrow">Applicant details</p>

            {(error || actionError) && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={15} /> {actionError || error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {([["name", "Name"], ["email", "Email"], ["phone", "Mobile"]] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block section-label mb-1.5">{label}</label>
                  <input
                    className="input-base"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={label}
                  />
                </div>
              ))}
            </div>

            <button onClick={sendOtp} disabled={loading} className="btn-primary mt-5">
              {loading ? "Sending…" : "Send demo OTP"}
            </button>

            {otpMessage && (
              <div className="divider mt-6 pt-6">
                <p className="eyebrow">Verify</p>
                <p className="text-sm text-slate-500 mt-1.5">{otpMessage}</p>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <input
                    className="input-base w-40 font-mono tracking-[0.3em] text-center text-lg"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                  />
                  <button onClick={verify} disabled={verifying || !otp} className="btn-primary">
                    {verifying ? "Verifying…" : "Verify & continue"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/filing/dashboard"
            className="block text-sm font-medium text-slate-500 hover:text-slate-800 mt-4"
          >
            ← Back to My RTIs
          </Link>
        </div>

        <aside className="panel p-6">
          <p className="eyebrow">Simulated verification</p>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Demo OTP is <span className="font-mono font-medium text-slate-800">123456</span>. No SMS
            is sent and no details leave your browser.
          </p>
        </aside>
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
    <PageShell
      crumbs={[{ label: "My RTIs", to: "/filing/dashboard" }, { label: "File" }, { label: "Documents" }]}
      title="Supporting documents"
      subtitle="Optional. You can continue without attaching anything."
      stepKey="documents"
    >
      <div className="panel p-6 max-w-2xl">
        <p className="eyebrow">Documents</p>
        <p className="text-sm text-slate-500 mt-2">Optional supporting documents</p>

        <button
          onClick={upload}
          disabled={uploading}
          className="mt-4 text-sm font-medium text-primary-700 hover:text-primary-900 disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "+ Add demo document"}
        </button>

        {docs.length > 0 && (
          <div className="divider mt-5 pt-5 space-y-2">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 border border-slate-200 rounded-lg px-4 py-3"
              >
                <FileText size={15} className="text-slate-400 shrink-0" />
                <span className="text-sm text-slate-700 font-medium flex-1 truncate">{d.filename}</span>
                <span className="text-xs text-slate-400 shrink-0">{(d.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav
        backLabel="Back to applicant"
        backTo={`/filing/${rtiId}/applicant`}
        forwardLabel="Continue to payment"
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

  const paid = rti?.status === "PAYMENT_SUCCESS";

  return (
    <PageShell
      crumbs={[{ label: "My RTIs", to: "/filing/dashboard" }, { label: "File" }, { label: "Payment" }]}
      title="Payment"
      subtitle="A ₹10 filing fee. Simulated in demo mode — no payment provider is called."
      stepKey="payment"
    >
      <div className="panel p-6 max-w-2xl">
        <p className="status-eyebrow text-primary-700">Simulated payment · demo mode</p>
        <div className="flex items-baseline justify-between gap-4 mt-3">
          <p className="text-sm text-slate-600">RTI application fee</p>
          <p className="text-xl font-bold text-slate-900">₹10</p>
        </div>

        <div className="divider mt-5 pt-5 flex flex-wrap gap-3">
          <button
            onClick={() => pay("SUCCESS")}
            disabled={paying !== null}
            className="btn-primary"
          >
            {paying === "SUCCESS" ? "Processing…" : paid ? "Paid — continue" : "Pay ₹10 (simulated)"}
          </button>
          <button
            onClick={() => pay("FAILED")}
            disabled={paying !== null}
            className="text-sm font-medium text-slate-500 hover:text-red-600"
          >
            {paying === "FAILED" ? "Processing…" : "Simulate a failed payment"}
          </button>
        </div>
      </div>

      <BottomNav
        backLabel="Back to documents"
        backTo={`/filing/${rtiId}/documents`}
        forwardLabel="Continue to review"
        onForward={() => navigate(`/filing/${rtiId}/review`)}
        forwardDisabled={!paid}
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
    <PageShell
      crumbs={[{ label: "My RTIs", to: "/filing/dashboard" }, { label: "File" }, { label: "Review" }]}
      title="Review & submit"
      subtitle="Check the final request. Submitting generates a demo registration number — nothing is filed with a government system."
      stepKey="review"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div>
          <div className="panel p-6">
            <p className="eyebrow">Final RTI request</p>
            <pre className="mt-3 text-[15px] text-slate-700 leading-7 whitespace-pre-wrap font-sans max-h-[420px] overflow-y-auto bg-slate-50 rounded-lg p-4 border border-slate-100">
              {rti?.final_request ?? "Loading…"}
            </pre>
          </div>

          <BottomNav
            backLabel="Back to payment"
            backTo={`/filing/${rtiId}/payment`}
            forwardLabel={submitting ? "Submitting…" : "Submit RTI"}
            onForward={submit}
            forwardDisabled={submitting || !rti}
          />
        </div>

        <aside className="panel p-6">
          <p className="eyebrow">Addressed to</p>
          <p className="text-sm font-medium text-slate-800 mt-1.5">{rti?.authority_name}</p>
          <p className="text-[13px] text-slate-400 mt-4 divider pt-4 leading-relaxed">
            Simulated submission — no Public Information Officer or rtionline.gov.in is contacted.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}

// ─── Submitted ────────────────────────────────────────────────────────────────

function Submitted() {
  const { rti } = useRti();

  return (
    <PageShell
      crumbs={[{ label: "My RTIs", to: "/filing/dashboard" }, { label: "Submitted" }]}
      title="Submission recorded."
    >
      <div className="status-banner-green">
        <p className="status-eyebrow text-emerald-700">RTI submitted</p>
        <p className="text-base font-bold text-slate-900 mt-1">
          {rti?.registration_number
            ? `Reference ${rti.registration_number}`
            : "Your RTI has been recorded."}
          {rti?.submitted_at && (
            <span className="font-normal text-slate-500"> · Filed {formatFriendlyDate(rti.submitted_at)}</span>
          )}
        </p>
        <p className="text-sm text-slate-600 mt-0.5">
          Simulated submission for the demo — no RTI was filed with any government system.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start mt-6">
        <div className="panel p-6">
          <p className="eyebrow">What we recorded</p>
          <dl className="mt-3 space-y-3">
            <div>
              <dt className="section-label">Registration number</dt>
              <dd className="text-sm font-mono font-medium text-slate-900 mt-1">
                {rti?.registration_number ?? "Pending…"}
              </dd>
            </div>
            {rti?.submitted_at && (
              <div>
                <dt className="section-label">Filed</dt>
                <dd className="text-sm font-medium text-slate-800 mt-1">{formatFriendlyDate(rti.submitted_at)}</dd>
              </div>
            )}
            {rti?.response_due_at && (
              <div>
                <dt className="section-label">Response due</dt>
                <dd className="text-sm font-medium text-slate-800 mt-1">{formatFriendlyDate(rti.response_due_at)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="panel p-6">
          <p className="eyebrow">What happens next</p>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            The authority has 30 days to respond. RTI Navigator tracks the deadline in My RTIs. If it
            passes with no reply, a First Appeal is prepared for you from this record.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Link to="/filing/dashboard" className="btn-primary w-full sm:w-auto sm:min-w-[220px] inline-block text-center">
          Go to My RTIs
        </Link>
        <Link to="/" className="block sm:inline-block sm:ml-5 mt-3 sm:mt-0 text-sm font-medium text-slate-500 hover:text-slate-800">
          Start another request
        </Link>
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
      // Fast-forward the demo clock without leaving the dashboard.
      await api("/demo/time/fastforward", { method: "POST" });
      await loadAll();
    } finally { setFastforwarding(false); }
  }

  // Partition RTIs by urgency
  const overdueRtis = rtis.filter(
    (r) => r.is_overdue && r.status === "AWAITING_RESPONSE" && !r.appeal_submitted,
  );
  const appealFiledRtis = rtis.filter(
    (r) => r.is_overdue && r.status === "AWAITING_RESPONSE" && r.appeal_submitted,
  );
  const awaitingRtis = rtis.filter((r) => !r.is_overdue && r.status === "AWAITING_RESPONSE");
  const activeRtis = rtis.filter(
    (r) => r.status !== "AWAITING_RESPONSE" && r.status !== "RESPONSE_RECEIVED",
  );
  const doneRtis = rtis.filter((r) => r.status === "RESPONSE_RECEIVED");
  const attentionCount = overdueRtis.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />

      <div className="page animate-slide-up">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "My RTIs" }]} />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="page-title">My RTIs</h1>
            <p className="page-subtitle">
              Keep every RTI visible — especially when a response needs follow-up.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/" className="btn-primary text-sm">New request</Link>
            <button onClick={jumpToFiling} className="btn-secondary text-sm">Jump to filing</button>
          </div>
        </div>

        {DEMO_MODE && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <DemoTimeControls
              demoNow={demoNow}
              onTimeChange={loadAll}
              onAdvance={advanceTime}
              onReset={resetTime}
              compact
            />
            <button
              onClick={runFastForwardDemo}
              disabled={fastforwarding}
              className="text-xs font-medium text-primary-700 hover:text-primary-900 disabled:opacity-60"
            >
              {fastforwarding ? "Advancing…" : "Run 30-day demo →"}
            </button>
            <button
              onClick={reset}
              disabled={resetting}
              className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1.5 ml-auto"
            >
              <RefreshCw size={11} className={resetting ? "animate-spin" : ""} />
              {resetting ? "Resetting…" : "Reset demo"}
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { label: "Active", value: awaitingRtis.length, tone: "text-slate-400" },
            { label: "Overdue", value: attentionCount, tone: "text-red-600" },
            { label: "Submitted", value: rtis.filter((r) => r.registration_number).length, tone: "text-slate-400" },
          ].map((s) => (
            <div key={s.label} className="panel p-4 sm:p-5">
              <p className={`status-eyebrow ${s.tone}`}>{s.label}</p>
              <p className="text-[28px] font-bold text-slate-900 mt-1 tabular-nums leading-none">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Request rows */}
        <h2 className="section-title mt-8 mb-3">Your requests</h2>
        {rtis.length === 0 ? (
          <div className="panel text-center py-12">
            <p className="text-slate-500 font-medium">No RTIs yet</p>
            <p className="text-sm text-slate-400 mt-1">Start a request from the button above.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {[...overdueRtis, ...appealFiledRtis, ...awaitingRtis, ...activeRtis, ...doneRtis].map((rti) => (
              <RtiCard key={rti.id} rti={rti} onClick={() => navigate(`/filing/rtis/${rti.id}`)} />
            ))}
          </div>
        )}

        <div className="mt-10">
          <DisclosureCard />
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

// ─── Dashboard RTI card ───────────────────────────────────────────────────────

function RtiCard({ rti, onClick }: { rti: any; onClick: () => void }) {
  const humanStatusText = rti.is_overdue ? "Response overdue" : humanStatus(rti.status ?? "draft");
  const deadlineText =
    rti.days_remaining === null
      ? null
      : rti.is_overdue
      ? `${rti.days_overdue_count} day${rti.days_overdue_count !== 1 ? "s" : ""} overdue`
      : rti.days_remaining === 0
      ? "Response due today"
      : `${rti.days_remaining} day${rti.days_remaining !== 1 ? "s" : ""} remaining`;

  return (
    <button
      onClick={onClick}
      className="panel w-full text-left p-5 hover:border-slate-300 transition-colors
                grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate">{rti.subject || rti.authority_name}</p>
        <p className="text-sm text-slate-500 truncate mt-0.5">{rti.authority_name}</p>
        {rti.registration_number && (
          <p className="text-xs font-mono text-slate-400 mt-1">{rti.registration_number}</p>
        )}
      </div>
      <div className="sm:text-right shrink-0">
        <p className={`text-sm font-medium ${rti.is_overdue ? "text-red-700" : "text-slate-700"}`}>
          {humanStatusText}
        </p>
        {deadlineText && <p className="text-xs text-slate-500 mt-0.5">{deadlineText}</p>}
        {rti.next_action?.title && (
          <p className="text-xs text-slate-500 mt-1.5">
            Next action: <span className="text-slate-800 font-medium">{rti.next_action.title}</span>
          </p>
        )}
      </div>
    </button>
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  async function submitAppeal() {
    setSubmitError("");
    setSubmitting(true);
    try {
      await api(`/rtis/${rtiId}/appeal/submit`, { method: "POST" });
      setEditing(false);
      await reload();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
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
  const appealSubmitted = Boolean(rti?.first_appeal?.submitted_at);

  // ── First Appeal — dedicated full page (Ready / Submitted) ─────────────────
  if (rti && rti.first_appeal) {
    const fa = rti.first_appeal;
    const backToRti = (
      <Link
        to="/filing/dashboard"
        className="block text-sm font-medium text-slate-500 hover:text-slate-800 mt-4"
      >
        ← Back to My RTIs
      </Link>
    );

    const crumbs = [
      { label: "My RTIs", to: "/filing/dashboard" },
      { label: rti.registration_number || `RTI #${rtiId}` },
      { label: "First Appeal" },
    ];

    if (appealSubmitted) {
      return (
        <div className="min-h-screen flex flex-col bg-slate-50">
          <AppHeader />
          <div className="page animate-slide-up">
            <Breadcrumb items={crumbs} />
            <h1 className="page-title">First Appeal submitted</h1>

            <div className="status-banner-green mt-6">
              <p className="status-eyebrow text-emerald-700">First Appeal submitted</p>
              <p className="text-base font-bold text-slate-900 mt-1">Your First Appeal has been submitted.</p>
              <p className="text-sm text-slate-600 mt-0.5">
                Reference: <span className="font-mono">{fa.appeal_reference_number}</span>
                {fa.submitted_at && ` · Submitted ${formatFriendlyDate(fa.submitted_at)}`}
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2 items-start mt-6">
              <div className="panel p-6">
                <p className="eyebrow">Appeal details</p>
                <dl className="mt-3 space-y-3">
                  <div>
                    <dt className="section-label">Linked RTI</dt>
                    <dd className="text-sm font-mono font-medium text-slate-900 mt-1">{rti.registration_number}</dd>
                  </div>
                  <div>
                    <dt className="section-label">Status</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-1">Submitted (simulated)</dd>
                  </div>
                  <div>
                    <dt className="section-label">Authority</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-1">First Appellate Authority</dd>
                  </div>
                </dl>
              </div>

              <div className="panel p-6">
                <p className="eyebrow">What happens next</p>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  The original RTI remains visible in My RTIs. The appeal is recorded separately so
                  you can track the follow-up without losing the original filing context.
                </p>
              </div>
            </div>

            <div className="panel p-6 mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow">Appeal text</p>
                <div className="flex items-center gap-4">
                  <button onClick={copyAppeal} className="text-xs font-medium text-slate-500 hover:text-slate-900">
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button onClick={downloadAppeal} className="text-xs font-medium text-slate-500 hover:text-slate-900">
                    Download
                  </button>
                </div>
              </div>
              <pre className="mt-3 text-[15px] text-slate-700 leading-7 whitespace-pre-wrap font-sans bg-slate-50 rounded-lg p-4 border border-slate-100">
                {appealText}
              </pre>
              <p className="text-[13px] text-slate-400 mt-3">
                Simulated submission — no appellate authority was contacted.
              </p>
            </div>

            {backToRti}
          </div>
          <AppFooter />
        </div>
      );
    }

    // First Appeal — Ready
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <AppHeader />
        <div className="page animate-slide-up">
          <Breadcrumb items={crumbs} />
          <h1 className="page-title">First Appeal</h1>
          <p className="page-subtitle max-w-2xl mb-8">
            Generated from the RTI record because the response is overdue. Review, edit, and save
            before submission.
          </p>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
            <div>
              <div className="panel overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50">
                  <span className="eyebrow">First Appeal draft</span>
                  <div className="flex items-center gap-4">
                    <button onClick={copyAppeal} className="text-xs font-medium text-slate-500 hover:text-slate-900">
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button onClick={downloadAppeal} className="text-xs font-medium text-slate-500 hover:text-slate-900">
                      Download
                    </button>
                  </div>
                </div>
                <textarea
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  rows={18}
                  className="w-full resize-y bg-white px-5 py-5 text-slate-800 text-[15px] leading-7 focus:outline-none"
                />
                <div className="px-5 py-3 border-t border-slate-200 text-[13px] text-slate-400">
                  Linked RTI: <span className="font-mono">{rti.registration_number}</span> · Reason: {fa.reason}
                </div>
              </div>

              {submitError && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} /> {submitError}
                </p>
              )}
              {backToRti}
            </div>

            <aside>
              <div className="panel p-6">
                <p className="eyebrow">Submission status</p>
                <p className="text-sm font-semibold text-slate-900 mt-3">Ready to submit</p>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  The text remains editable until you submit the simulated appeal.
                </p>
              </div>
              <button onClick={saveAppeal} disabled={saving} className="btn-secondary w-full mt-4">
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button onClick={submitAppeal} disabled={submitting} className="btn-primary w-full mt-3">
                {submitting ? "Submitting…" : "Submit First Appeal"}
              </button>
              <p className="status-eyebrow text-slate-400 mt-3">Simulated · demo mode only</p>
            </aside>
          </div>
        </div>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />

      <div className="page animate-slide-up">
        <Breadcrumb items={[
          { label: "My RTIs", to: "/filing/dashboard" },
          { label: rti?.registration_number || `RTI #${rtiId}` },
        ]} />

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <h1 className="page-title">{rti?.registration_number || `RTI #${rtiId}`}</h1>
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

        {/* Status banner */}
        {rti && (
          <div className={
            rti.is_overdue ? "status-banner-red" :
            appealSubmitted ? "status-banner-green" :
            isAwaitingResponse ? "status-banner-blue" : "status-banner-amber"
          }>
            <p className={`status-eyebrow ${
              rti.is_overdue ? "text-red-700" : appealSubmitted ? "text-emerald-700" : "text-primary-700"
            }`}>
              {rti.is_overdue ? "Overdue" : appealSubmitted ? "First Appeal submitted" : humanStatus(rti.status).toUpperCase()}
            </p>
            <p className="text-base font-bold text-slate-900 mt-1">
              {rti.is_overdue
                ? "The response date has passed."
                : appealSubmitted
                ? `Reference ${rti.first_appeal?.appeal_reference_number}`
                : rti.response_due_at
                ? `Response due ${formatFriendlyDate(rti.response_due_at)}`
                : "Ready to file"}
            </p>
            {rti.is_overdue && !hasAppeal && (
              <p className="text-sm text-slate-600 mt-0.5">You can now consider filing a First Appeal.</p>
            )}
          </div>
        )}

        <div className="mt-6">
          <p className="section-title">{rti?.authority_name}</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {rti?.submitted_at && `Filed ${formatFriendlyDate(rti.submitted_at)}`}
            {rti?.submitted_at && rti?.response_due_at && " · "}
            {rti?.response_due_at && `Response due ${formatFriendlyDate(rti.response_due_at)}`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-10 items-start mt-6">
          <div className="space-y-6">
            <div className="panel p-5 sm:p-6">
              <p className="section-label mb-3">Your request</p>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-5">
                <pre className="text-[15px] text-slate-700 leading-7 whitespace-pre-wrap font-sans max-h-72 overflow-y-auto">
                  {rti?.final_request ?? "Loading…"}
                </pre>
              </div>

              {rti?.next_action && (
                <>
                  <p className="section-label mb-2">Next action</p>
                  <NextActionCard
                    nextAction={rti.next_action}
                    isOverdue={rti.is_overdue}
                    daysRemaining={rti.days_remaining}
                    daysOverdueCount={rti.days_overdue_count}
                    onGenerateAppeal={rti.is_overdue ? generateAppeal : undefined}
                    generating={generating}
                  />
                  {generateError && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={12} /> {generateError}
                    </p>
                  )}
                </>
              )}
            </div>


            {!isAwaitingResponse && rti?.submitted_at && (
              <div className="panel p-5 sm:p-6">
                <p className="eyebrow">Filing dates</p>
                <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                  <div>
                    <p className="section-label">Submitted</p>
                    <p className="font-medium text-slate-800 mt-1">{formatFriendlyDate(rti.submitted_at)}</p>
                  </div>
                  {rti.response_due_at && (
                    <div>
                      <p className="section-label">Response due</p>
                      <p className="font-medium text-slate-800 mt-1">{formatFriendlyDate(rti.response_due_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {rti?.documents && rti.documents.length > 0 && (
              <div className="panel p-5 sm:p-6">
                <p className="eyebrow">Documents</p>
                <div className="space-y-2 mt-3">
                  {rti.documents.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 border border-slate-200 rounded-lg px-4 py-3"
                    >
                      <FileText size={15} className="text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 font-medium flex-1 truncate">{d.filename}</span>
                      <span className="text-xs text-slate-400 shrink-0">{(d.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="panel p-5 h-fit lg:sticky lg:top-24">
            <h3 className="section-title mb-4">RTI timeline</h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400">No events yet.</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((event, i) => {
                  const isLast = i === timeline.length - 1
                  return (
                    <li key={event.id} className="flex items-start gap-2.5">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isLast ? "bg-primary-600" : "bg-slate-300"}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{event.title}</p>
                        <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{event.description}</p>
                      </div>
                    </li>
                  )
                })}
                {rti?.response_due_at && !rti.is_overdue && (
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 border border-slate-300" />
                    <p className="text-sm text-slate-400">Response due {formatFriendlyDate(rti.response_due_at)}</p>
                  </li>
                )}
              </ol>
            )}
          </aside>
        </div>
      </div>
      <AppFooter />
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

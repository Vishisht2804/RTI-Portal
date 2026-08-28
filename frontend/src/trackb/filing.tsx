/**
 * Track B — filing lifecycle screens.
 *
 * Migrated to Track A's design system (Tailwind + Track A component classes).
 * No trackb.css — uses: card, btn-primary, btn-secondary, input-base, badge-*
 * All functionality preserved; only JSX/classes changed.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  Check, CheckCircle2, Circle, CreditCard, FileText,
  LayoutDashboard, RefreshCw, Send, Upload, AlertCircle,
  ChevronRight, Clock, User,
} from "lucide-react";

const API_URL = "/api/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RtiDetail = {
  id: number;
  registration_number: string | null;
  authority_name: string;
  status: string;
  final_request: string;
  documents: { id: number; filename: string; size: number }[];
  status_events: { id: number; title: string; description: string; status: string }[];
  next_action: { title: string; description: string; action?: string; action_url?: string };
};

// ─── API helper ───────────────────────────────────────────────────────────────

export async function api(path: string, options: { method?: string; body?: unknown } = {}) {
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

// ─── Shared: Filing header (Track A style) ────────────────────────────────────

function FilingHeader() {
  return (
    <div className="w-full bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
      {/* Tricolour accent — matches Track A exactly */}
      <div className="tricolour-bar" />

      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/filing/dashboard" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 bg-primary-800 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-bold text-primary-900 text-lg tracking-tight">RTI Navigator</span>
          <span className="hidden sm:inline text-slate-400 text-xs ml-1">Filing Portal</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            New RTI
          </Link>
          <Link
            to="/filing/dashboard"
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            <LayoutDashboard size={14} /> Dashboard
          </Link>
        </nav>
      </div>
    </div>
  );
}

// ─── Shared: Filing stepper ───────────────────────────────────────────────────

function FilingStepper({ currentKey }: { currentKey: string }) {
  const currentIdx = FILING_STEPS.findIndex((s) => s.key === currentKey);

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex items-center">
        {FILING_STEPS.map((step, idx) => {
          const done   = idx < currentIdx;
          const active = idx === currentIdx;
          const future = idx > currentIdx;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center min-w-[32px]">
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
  );
}

// ─── Shared: Context info bar ─────────────────────────────────────────────────

function ContextBar({ rti }: { rti: RtiDetail | null }) {
  const statusColor = rti?.status === "submitted"
    ? "badge-green"
    : rti?.status === "payment_failed"
    ? "badge-red"
    : "badge-blue";

  return (
    <div className="flex items-center flex-wrap gap-3 mb-6 pb-5 border-b border-slate-100">
      <div className="flex items-center gap-2 text-slate-600">
        <FileText size={16} className="text-primary-600 shrink-0" />
        <span className="font-semibold text-slate-800">
          {rti?.authority_name ?? "Loading…"}
        </span>
      </div>
      {rti?.status && (
        <span className={`badge ${statusColor} capitalize`}>{rti.status.replace(/_/g, " ")}</span>
      )}
      {rti?.registration_number && (
        <span className="badge badge-slate font-mono text-[11px]">{rti.registration_number}</span>
      )}
    </div>
  );
}

// ─── Shared: Page shell ───────────────────────────────────────────────────────

function PageShell({
  eyebrow, title, stepKey, children,
}: {
  eyebrow: string;
  title: string;
  stepKey?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <FilingHeader />
      {stepKey && <FilingStepper currentKey={stepKey} />}

      <div className="max-w-2xl w-full mx-auto px-4 pb-16 animate-slide-up">
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{eyebrow}</p>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        </div>
        {children}
      </div>
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

  async function submit() {
    setLoading(true);
    try {
      await api(`/rtis/${rtiId}/applicant`, { method: "POST", body: form });
      const r = await api(`/rtis/${rtiId}/otp/send`, { method: "POST" });
      setOtpMessage(r.message);
    } finally { setLoading(false); }
  }

  async function verify() {
    setVerifying(true);
    try {
      await api(`/rtis/${rtiId}/otp/verify`, { method: "POST", body: { otp } });
      navigate(`/filing/${rtiId}/documents`);
    } finally { setVerifying(false); }
  }

  return (
    <PageShell eyebrow="Filing · Step 1 of 4" title="Applicant Details" stepKey="applicant">
      <div className="card mb-4">
        <ContextBar rti={rti} />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2 mb-4">
            <AlertCircle size={15} /> {error}
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

        <button onClick={submit} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? "Sending…" : <><User size={15} /> Send demo OTP</>}
        </button>

        {otpMessage && (
          <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            {otpMessage}
          </p>
        )}
      </div>

      {otpMessage && (
        <div className="card">
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
      await fetch(`${API_URL}/documents`, { method: "POST", body: form });
      await reload();
    } finally { setUploading(false); }
  }

  const docs = rti?.documents ?? [];

  return (
    <PageShell eyebrow="Filing · Step 2 of 4" title="Documents" stepKey="documents">
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

      <div className="flex justify-end">
        <button
          onClick={() => navigate(`/filing/${rtiId}/payment`)}
          className="btn-primary flex items-center gap-2"
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
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
    <PageShell eyebrow="Filing · Step 3 of 4" title="Payment" stepKey="payment">
      <div className="card mb-4">
        <ContextBar rti={rti} />

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-orange-800 mb-1">Simulated Payment</p>
          <p className="text-sm text-orange-700">
            Rs. 10 application fee. No real payment is processed in this demo.
          </p>
        </div>

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
    <PageShell eyebrow="Filing · Step 4 of 4" title="Review &amp; Submit" stepKey="review">
      <div className="card mb-4">
        <ContextBar rti={rti} />

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Final RTI Request
        </p>
        <div className="bg-slate-50 border-l-4 border-primary-600 rounded-lg p-4 mb-6">
          <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
            {rti?.final_request ?? "Loading…"}
          </pre>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800">
            By submitting, you confirm this RTI application is accurate and complete.
            This is a simulated submission for the hackathon demo.
          </p>
        </div>

        <button
          onClick={submit}
          disabled={submitting || !rti}
          className="btn-primary w-full flex items-center justify-center gap-2 text-base"
        >
          <Send size={16} />
          {submitting ? "Submitting…" : "Simulate submission"}
        </button>
      </div>
    </PageShell>
  );
}

// ─── Submitted ────────────────────────────────────────────────────────────────

function Submitted() {
  const { rti } = useRti();

  return (
    <PageShell eyebrow="Confirmation" title="Submission Recorded">
      <div className="card text-center">
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

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/filing/dashboard" className="btn-primary flex items-center justify-center gap-2">
            <LayoutDashboard size={15} /> Go to dashboard
          </Link>
          <Link to="/" className="btn-secondary flex items-center justify-center gap-2">
            File another RTI
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  submitted:       "badge-green",
  payment_failed:  "badge-red",
  pending_payment: "badge-orange",
  draft:           "badge-slate",
  in_review:       "badge-blue",
};

function Dashboard() {
  const [rtis, setRtis] = useState<any[]>([]);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api("/rtis").then(setRtis); }, []);

  async function reset() {
    setResetting(true);
    try {
      await api("/demo/reset", { method: "POST" });
      setRtis(await api("/rtis"));
    } finally { setResetting(false); }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <FilingHeader />

      <div className="max-w-3xl w-full mx-auto px-4 py-10 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Citizen RTIs</p>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          </div>
          <button
            onClick={reset}
            disabled={resetting}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} className={resetting ? "animate-spin" : ""} />
            {resetting ? "Resetting…" : "Demo reset"}
          </button>
        </div>

        {rtis.length === 0 ? (
          <div className="card text-center py-12">
            <FileText size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No RTIs yet</p>
            <p className="text-sm text-slate-400 mt-1 mb-5">File your first RTI using Track A</p>
            <Link to="/" className="btn-primary inline-flex items-center gap-2">
              Start new RTI
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rtis.map((rti) => {
              const badgeClass = STATUS_BADGE[rti.status] ?? "badge-slate";
              return (
                <div
                  key={rti.id}
                  onClick={() => navigate(`/filing/rtis/${rti.id}`)}
                  className="card hover:shadow-md hover:border-primary-100 cursor-pointer transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${badgeClass} capitalize`}>
                        {(rti.status ?? "draft").replace(/_/g, " ")}
                      </span>
                      {rti.registration_number && (
                        <span className="badge badge-slate font-mono text-[10px]">
                          {rti.registration_number}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-slate-300 shrink-0 mt-0.5" />
                  </div>

                  <p className="font-semibold text-slate-800 mb-1">{rti.authority_name}</p>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{rti.subject}</p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={11} />
                    <span className="capitalize">{rti.next_action?.title ?? "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RTI Detail ────────────────────────────────────────────────────────────────

function Detail() {
  const { rti } = useRti();
  const timeline = useMemo(() => rti?.status_events ?? [], [rti]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <FilingHeader />

      <div className="max-w-5xl w-full mx-auto px-4 py-10 animate-slide-up">
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            {rti?.registration_number ?? "Case detail"}
          </p>
          <h1 className="text-2xl font-bold text-slate-800">RTI Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: Info */}
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

              {rti?.next_action && (
                <>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Next Step
                  </p>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-blue-800 mb-1">{rti.next_action.title}</p>
                    <p className="text-sm text-blue-700">{rti.next_action.description}</p>
                  </div>
                </>
              )}
            </div>

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

          {/* Right: Timeline */}
          <div className="card h-fit">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
              Status Timeline
            </p>

            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No events yet.</p>
            ) : (
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-5">
                {timeline.map((event, idx) => (
                  <div key={event.id} className="relative">
                    {/* Dot on timeline */}
                    <div className="absolute -left-[25px] w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>

                    <p className="text-sm font-semibold text-slate-800 mb-0.5">{event.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{event.description}</p>
                    {event.status && (
                      <span className="badge badge-blue mt-1.5 capitalize text-[10px]">
                        {event.status}
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

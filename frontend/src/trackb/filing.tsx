/**
 * Track B — filing lifecycle screens.
 *
 * Ported from the standalone RTI-Portal frontend into the merged app as a set of
 * route elements (no BrowserRouter of its own — it mounts inside Track A's router).
 * Track A's wizard hands off here after POST /api/v1/rtis via ReadyToFilePage.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Check, Circle, CreditCard, FileText, RefreshCw, Send, Upload } from "lucide-react";
import "./trackb.css";

const API_URL = "/api/v1";

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

export async function api(path: string, options: { method?: string; body?: unknown } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? "API request failed");
  }
  return data;
}

const steps = ["applicant", "documents", "payment", "review"];

function Page({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <>
      <header className="pageHeader">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
      </header>
      {children}
    </>
  );
}

function Stepper({ current }: { current: string }) {
  return (
    <div className="stepper">
      {steps.map((step) => (
        <div className={step === current ? "step active" : "step"} key={step}>
          {steps.indexOf(step) < steps.indexOf(current) ? <Check size={15} /> : <Circle size={15} />}
          {step}
        </div>
      ))}
    </div>
  );
}

function useRti() {
  const { rtiId } = useParams();
  const [rti, setRti] = useState<RtiDetail | null>(null);
  const [error, setError] = useState("");
  async function load() {
    if (!rtiId) return;
    try {
      setRti(await api(`/rtis/${rtiId}`));
    } catch (err) {
      setError(String(err));
    }
  }
  useEffect(() => {
    load();
  }, [rtiId]);
  return { rti, error, reload: load, rtiId: Number(rtiId) };
}

function Context({ rti }: { rti: RtiDetail | null }) {
  return (
    <div className="context">
      <FileText size={18} /> <b>{rti?.authority_name ?? "Loading..."}</b>
      <span>{rti?.status}</span>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Applicant() {
  const { rti, error, rtiId } = useRti();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "Demo Applicant", email: "demo@example.com", phone: "9999999999" });
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  async function submit() {
    await api(`/rtis/${rtiId}/applicant`, { method: "POST", body: form });
    const otpResponse = await api(`/rtis/${rtiId}/otp/send`, { method: "POST" });
    setMessage(otpResponse.message);
  }
  async function verify() {
    await api(`/rtis/${rtiId}/otp/verify`, { method: "POST", body: { otp } });
    navigate(`/filing/${rtiId}/documents`);
  }
  return (
    <Page title="Applicant Details" eyebrow="Filing step 1">
      <Stepper current="applicant" />
      <section className="band">
        {error && <p className="error">{error}</p>}
        <Context rti={rti} />
        <div className="grid3">
          {Object.entries(form).map(([key, value]) => (
            <input
              key={key}
              value={value}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              placeholder={key}
            />
          ))}
        </div>
        <button onClick={submit}>Send demo OTP</button>
        {message && <p className="muted">{message}</p>}
        <div className="inline">
          <input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="123456" />
          <button onClick={verify}>Verify OTP</button>
        </div>
      </section>
    </Page>
  );
}

function Documents() {
  const { rti, rtiId, reload } = useRti();
  const navigate = useNavigate();
  async function upload() {
    const blob = new Blob(["demo proof"], { type: "application/pdf" });
    const form = new FormData();
    form.append("rti_id", String(rtiId));
    form.append("file", blob, "supporting-document.pdf");
    await fetch(`${API_URL}/documents`, { method: "POST", body: form });
    await reload();
  }
  return (
    <Page title="Documents" eyebrow="Filing step 2">
      <Stepper current="documents" />
      <section className="band">
        <Context rti={rti} />
        <button onClick={upload}>
          <Upload size={16} /> Add demo document
        </button>
        <button className="secondary" onClick={() => navigate(`/filing/${rtiId}/payment`)}>
          Continue
        </button>
        <List items={rti?.documents.map((d) => d.filename) ?? []} />
      </section>
    </Page>
  );
}

function Payment() {
  const { rti, rtiId, reload } = useRti();
  const navigate = useNavigate();
  async function pay(force_result: "SUCCESS" | "FAILED") {
    await api(`/rtis/${rtiId}/payment`, { method: "POST", body: { force_result } });
    await reload();
    if (force_result === "SUCCESS") navigate(`/filing/${rtiId}/review`);
  }
  return (
    <Page title="Demo Payment" eyebrow="Filing step 3">
      <Stepper current="payment" />
      <section className="band">
        <Context rti={rti} />
        <p className="notice">Simulated Rs. 10 application fee. No real payment is processed.</p>
        <button onClick={() => pay("SUCCESS")}>
          <CreditCard size={16} /> Mark payment success
        </button>
        <button className="secondary" onClick={() => pay("FAILED")}>
          Simulate failure
        </button>
      </section>
    </Page>
  );
}

function Review() {
  const { rti, rtiId } = useRti();
  const navigate = useNavigate();
  async function submit() {
    await api(`/rtis/${rtiId}/submit`, { method: "POST" });
    navigate(`/filing/${rtiId}/submitted`);
  }
  return (
    <Page title="Review RTI" eyebrow="Filing step 4">
      <Stepper current="review" />
      <section className="band">
        <Context rti={rti} />
        <div className="requestBox">{rti?.final_request}</div>
        <button onClick={submit}>
          <Send size={16} /> Simulate submission
        </button>
      </section>
    </Page>
  );
}

function Submitted() {
  const { rti } = useRti();
  return (
    <Page title="Submission Recorded" eyebrow="Prototype confirmation">
      <section className="band">
        <p className="notice">This is a simulated government submission for the hackathon MVP.</p>
        <h2>{rti?.registration_number ?? "Registration pending"}</h2>
        <Link className="buttonLink" to="/filing/dashboard">
          Go to dashboard
        </Link>
      </section>
    </Page>
  );
}

function Dashboard() {
  const [rtis, setRtis] = useState<any[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    api("/rtis").then(setRtis);
  }, []);
  async function reset() {
    await api("/demo/reset", { method: "POST" });
    setRtis(await api("/rtis"));
  }
  return (
    <Page title="Dashboard" eyebrow="Citizen RTIs">
      <section className="toolbar">
        <button onClick={reset}>
          <RefreshCw size={16} /> Demo reset
        </button>
      </section>
      <section className="list">
        {rtis.map((rti) => (
          <article key={rti.id} onClick={() => navigate(`/filing/rtis/${rti.id}`)}>
            <b>{rti.registration_number ?? "Not submitted yet"}</b>
            <span>{rti.authority_name}</span>
            <p>{rti.subject}</p>
            <small>
              {rti.status} · {rti.next_action.title}
            </small>
          </article>
        ))}
      </section>
    </Page>
  );
}

function Detail() {
  const { rti } = useRti();
  const timeline = useMemo(() => rti?.status_events ?? [], [rti]);
  return (
    <Page title="RTI Details" eyebrow={rti?.registration_number ?? "Case detail"}>
      <section className="band detailGrid">
        <div>
          <Context rti={rti} />
          <div className="requestBox">{rti?.final_request}</div>
          <h3>What happens next?</h3>
          <p>{rti?.next_action.description}</p>
        </div>
        <div className="timeline">
          {timeline.map((event) => (
            <div className="timelineEvent" key={event.id}>
              <Check size={16} />
              <div>
                <b>{event.title}</b>
                <p>{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Page>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="trackb">
      <div className="appShell">
        <aside>
          <Link className="brand" to="/filing/dashboard">
            RTI Navigator
          </Link>
          <span>Track B lifecycle</span>
          <nav>
            <Link to="/">New RTI (Track A)</Link>
            <Link to="/filing/dashboard">Dashboard</Link>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

/** All Track B routes, mounted by Track A's <App> under /filing/*. */
export default function FilingRoutes() {
  return (
    <Shell>
      <Routes>
        <Route index element={<Navigate to="/filing/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="rtis/:rtiId" element={<Detail />} />
        <Route path=":rtiId/applicant" element={<Applicant />} />
        <Route path=":rtiId/documents" element={<Documents />} />
        <Route path=":rtiId/payment" element={<Payment />} />
        <Route path=":rtiId/review" element={<Review />} />
        <Route path=":rtiId/submitted" element={<Submitted />} />
      </Routes>
    </Shell>
  );
}

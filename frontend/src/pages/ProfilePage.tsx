import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Phone, Edit2, Check, ArrowLeft } from 'lucide-react'
import { AppHeader } from '../components/common/AppHeader'

const DEFAULT_PROFILE = {
  name:  'Demo Applicant',
  email: 'demo@example.com',
  phone: '9999999999',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(DEFAULT_PROFILE)

  function startEdit() { setDraft(profile); setEditing(true) }
  function save()      { setProfile(draft);  setEditing(false) }
  function cancel()    { setEditing(false) }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />

      <div className="max-w-2xl w-full mx-auto px-4 py-10 animate-slide-up">
        <Link to="/filing/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Account</p>
          <h1 className="text-2xl font-bold text-slate-800">Profile</h1>
        </div>

        {/* Avatar + name */}
        <div className="card mb-4 flex items-center gap-5">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
            <User size={28} className="text-primary-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-lg">{profile.name}</p>
            <p className="text-sm text-slate-500">Demo citizen account</p>
          </div>
          <span className="badge badge-blue hidden sm:inline-flex">Demo</span>
        </div>

        {/* Details */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Information</p>
            {!editing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-sm text-primary-700 hover:text-primary-900 font-medium"
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              {(['name', 'email', 'phone'] as const).map((key) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 capitalize">
                    {key}
                  </label>
                  <input
                    className="input-base"
                    value={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={save}   className="btn-primary flex items-center gap-2"><Check size={14} /> Save</button>
                <button onClick={cancel} className="btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Row icon={<User size={15} />}  label="Full Name" value={profile.name} />
              <Row icon={<Mail size={15} />}  label="Email"     value={profile.email} />
              <Row icon={<Phone size={15} />} label="Phone"     value={profile.phone} />
            </div>
          )}
        </div>

        {/* Demo note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
          This is a demo account. Profile changes are local only and reset on page refresh.
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-primary-600 shrink-0">{icon}</span>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  )
}

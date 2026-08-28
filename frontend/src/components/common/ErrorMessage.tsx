import { AlertCircleIcon, RefreshCcwIcon } from 'lucide-react'

interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircleIcon className="text-red-500" size={28} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-700">Something went wrong</p>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCcwIcon size={14} /> Try again
        </button>
      )}
    </div>
  )
}

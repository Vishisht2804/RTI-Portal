interface Props {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }

export function Spinner({ size = 'md', label }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizes[size]} border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin`}
      />
      {label && <p className="text-sm text-slate-500 animate-pulse-soft">{label}</p>}
    </div>
  )
}

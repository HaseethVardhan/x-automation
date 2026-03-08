type ErrorStateProps = {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function ErrorState({
  title,
  message,
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <section className="state-card" role="alert">
      <div className="eyebrow">Error</div>
      <h1>{title}</h1>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  )
}
type LoadingStateProps = {
  title: string
  message: string
}

export function LoadingState({ title, message }: LoadingStateProps) {
  return (
    <section className="state-card" aria-live="polite">
      <div className="eyebrow">Loading</div>
      <h1>{title}</h1>
      <p>{message}</p>
    </section>
  )
}
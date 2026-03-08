type EmptyStateProps = {
  title: string
  message: string
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <section className="state-card">
      <div className="eyebrow">Empty</div>
      <h1>{title}</h1>
      <p>{message}</p>
    </section>
  )
}
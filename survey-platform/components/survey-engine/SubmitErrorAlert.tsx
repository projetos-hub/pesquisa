'use client'

interface SubmitErrorAlertProps {
  message: string
  loading: boolean
  onRetry: () => void
}

export default function SubmitErrorAlert({ message, loading, onRetry }: SubmitErrorAlertProps) {
  return (
    <div className="submit-alert" role="alert" aria-live="assertive">
      <div>
        <p className="submit-alert-title">Nao foi possivel enviar sua resposta</p>
        <p className="submit-alert-message">{message}</p>
      </div>
      <button
        type="button"
        className="btn btn-primary submit-alert-action"
        onClick={onRetry}
        disabled={loading}
      >
        {loading ? 'Tentando novamente...' : 'Tentar novamente'}
      </button>
    </div>
  )
}

export default function ErrorScreen({ message, onRetry }) {
  return (
    <div className="app-wrapper">
      <div className="survey-card">
        <div className="survey-body">
          <div className="error-screen">
            <div className="error-icon">⚠️</div>
            <p className="error-msg">{message}</p>
            <button className="btn btn-primary" onClick={onRetry}>Tentar novamente</button>
          </div>
        </div>
      </div>
    </div>
  )
}

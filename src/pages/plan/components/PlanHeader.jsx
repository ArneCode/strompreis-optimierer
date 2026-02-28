function PlanHeader({ status, error, onGenerate, onRefresh, compareView, setCompareView }) {
  return (
    <div className="plan-header">
      <p>Ablaufplan</p>

      <div className="plan-header-info">
        <button
          className={status.currentlyRunning ? "generate-plan-button-running" : "generate-plan-button"}
          onClick={onGenerate}
          disabled={status.currentlyRunning}
          data-testid="plan-generate"
        >
          {status.currentlyRunning ? "Plan wird generiert..." : "Plan generieren"}
        </button>

        <button
          className={status.currentlyRunning ? "plan-refresh-button-running" : "plan-refresh-button"}
          onClick={onRefresh}
          disabled={status.currentlyRunning}
          data-testid="plan-refresh"
        >
          Aktualisieren
          <img src="./src/assets/images/refresh.png" />
        </button>

        <button
          className="plan-compare-button"
          onClick={() => setCompareView((v) => !v)}
          disabled={status.currentlyRunning}
          data-testid="plan-compare-toggle"
        >
          {compareView ? "Vergleichsansicht aus" : "Vergleichsansicht an"}
        </button>

        {!status.hasSchedule && !status.currentlyRunning && (
          <div>Noch kein Plan vorhanden. Klicke "Plan generieren".</div>
        )}

        {status.currentlyRunning && <div data-testid="plan-status" >Optimierung läuft... bitte warten.</div>}

        {error && <div className="error" data-testid="plan-error">{error}</div>}
      </div>
    </div>
  );
}

export default PlanHeader;
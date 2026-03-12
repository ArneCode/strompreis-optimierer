import { useEffect, useState } from "react";

function PlanHeader({ status, error, onGenerate, onRefresh, compareView, setCompareView, costEuro }) {

  const [showConstantActionHint, setShowConstantActionHint] = useState(false);

  useEffect(() => {
    if (status?.hasConstantActions) {
      setShowConstantActionHint(false);
    }
  }, [status?.hasConstantActions]);

  const handleGenerateClick = () => {
    if (!status?.hasConstantActions) {
      setShowConstantActionHint(true);
      return;
    }

    setShowConstantActionHint(false);
    onGenerate?.();
  };

  return (
    <>
      <div className="plan-header">
        <p>Ablaufplan</p>

        <div className="plan-header-info">
          <button
            className={
              status.currentlyRunning
                ? "generate-plan-button-running"
                : `generate-plan-button${
                    !status?.hasConstantActions ? " blocked" : ""
                  }`
            }
            onClick={handleGenerateClick}
            disabled={status.currentlyRunning}
          >
            {status.currentlyRunning
              ? "Plan wird generiert..."
              : "Plan generieren"}
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
        {showConstantActionHint && !status.currentlyRunning && (
          <div className="plan-inline-hint">
            Bitte erstelle zuerst mindestens eine durchlaufende Aktion
          </div>
        )}
      </div>
      <div className="plan-cost-container">
        {status.hasSchedule && !status.currentlyRunning && costEuro != null && (
          <div className="plan-cost">
            Gesamtkosten:{" "}
            {new Intl.NumberFormat("de-DE", {
              style: "currency",
              currency: "EUR",
            }).format(costEuro)}
          </div>
        )}
      </div>
    </>
  );
}

export default PlanHeader;
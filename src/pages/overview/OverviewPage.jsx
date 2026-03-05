import { useEffect, useMemo, useState } from "react";
import "../../styles/pages/Overview.css";
import apiService from "../../services/apiService";

function OverviewPage() {
  const [overview, setOverview] = useState({
    batteries: [],
    actions: [],
    generators: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiService.fetchOverview();

        if (!alive) return;

        setOverview({
          batteries: Array.isArray(data?.batteries) ? data.batteries : [],
          actions: Array.isArray(data?.actions) ? data.actions : [],
          generators: Array.isArray(data?.generators) ? data.generators : [],
        });
      } catch (e) {
        if (!alive) return;
        setError("Konnte Overview-Daten nicht laden.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const batteries = useMemo(() => overview.batteries, [overview]);
  const actions = useMemo(() => overview.actions, [overview]);
  const generators = useMemo(() => overview.generators, [overview]);

  const renderTile = (item) => {
    const normalizedStatus = String(item.status ?? "").toLowerCase();

    let statusClass = "";
    if (normalizedStatus === "charging") statusClass = "status-charging";
    if (normalizedStatus === "decharging" || normalizedStatus === "discharging")
      statusClass = "status-decharging";

    return (
      <article className="overview-tile" key={item.id ?? item.name}>
        <h3 className="tile-title">{item.name}</h3>

        <div className="tile-info">
          <div className="info-row">
            <span className="info-label">Status</span>
            <span className={`info-value ${statusClass}`}>{item.status}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Aktuelle Leistung</span>
            <span className="info-value">{Number(item.currentPower).toFixed(2)} W</span>
          </div>

          {"chargeLevel" in item && (
            <div className="info-row">
              <span className="info-label">Ladezustand</span>
              <span className="info-value">{Number(item.chargeLevel).toFixed(2)} Wh</span>
            </div>
          )}

          {"actionType" in item && (
            <div className="info-row">
              <span className="info-label">Typ</span>
              <span className="info-value">{item.actionType}</span>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="overview-page">
      <h1 className="overview-title">Aktuelle Übersicht</h1>

      {loading && <div className="overview-hint">Lade Daten…</div>}
      {!loading && error && <div className="overview-error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="group-section">
            <h2 className="group-title">Speicher</h2>
            <div className="overview-grid">
              {batteries.length ? batteries.map(renderTile) : (
                <div className="overview-empty">Keine Speicher vorhanden.</div>
              )}
            </div>
          </section>

          <section className="group-section">
            <h2 className="group-title">Aktionen</h2>
            <div className="overview-grid">
              {actions.length ? actions.map(renderTile) : (
                <div className="overview-empty">Keine Aktionen vorhanden.</div>
              )}
            </div>
          </section>

          <section className="group-section">
            <h2 className="group-title">Erzeuger</h2>
            <div className="overview-grid">
              {generators.length ? generators.map(renderTile) : (
                <div className="overview-empty">Keine Erzeuger vorhanden.</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default OverviewPage;
function CollapsibleSection({ id, title, right, collapsed, onToggle, children }) {
  return (
    <div className="compare-section">
      <div className="compare-section-head">
        <div className="compare-section-title">
          <button
            type="button"
            className="collapse-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle(id);
            }}
            aria-expanded={!collapsed}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <p style={{ margin: 0 }}>{title}</p>
        </div>

        <div className="compare-section-right">{right}</div>
      </div>

      {!collapsed && <div className="compare-section-body">{children}</div>}
    </div>
  );
}

export default CollapsibleSection;
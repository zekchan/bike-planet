import type { Mode } from "../planner-types";
import { MODE_OPTIONS } from "../planner-utils";

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

export function ModeSelector({ mode, onChange }: Props) {
  return (
    <section>
      <p className="section-label">Режим</p>
      <div className="mode-grid">
        {MODE_OPTIONS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`mode-button ${mode === item.id ? "active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.note}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

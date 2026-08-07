type Props = {
  maxDetour: number;
  preferredGradient: number;
  onMaxDetourChange: (value: number) => void;
  onPreferredGradientChange: (value: number) => void;
};

export function RouteSettings({
  maxDetour,
  preferredGradient,
  onMaxDetourChange,
  onPreferredGradientChange,
}: Props) {
  return (
    <section className="settings-grid">
      <label>
        <span>
          <b>Макс. крюк</b>
          <output>{maxDetour}%</output>
        </span>
        <input
          type="range"
          min="0"
          max="60"
          step="5"
          value={maxDetour}
          onChange={(event) => onMaxDetourChange(Number(event.target.value))}
        />
      </label>
      <label>
        <span>
          <b>Комфортный уклон</b>
          <output>{preferredGradient}%</output>
        </span>
        <input
          type="range"
          min="3"
          max="15"
          value={preferredGradient}
          onChange={(event) => onPreferredGradientChange(Number(event.target.value))}
        />
      </label>
    </section>
  );
}

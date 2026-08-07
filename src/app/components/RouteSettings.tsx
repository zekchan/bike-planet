type Props = {
  isLoop: boolean;
  targetDistanceKm: number;
  maxDetour: number;
  preferredGradient: number;
  onTargetDistanceChange: (value: number) => void;
  onMaxDetourChange: (value: number) => void;
  onPreferredGradientChange: (value: number) => void;
};

export function RouteSettings({
  isLoop,
  targetDistanceKm,
  maxDetour,
  preferredGradient,
  onTargetDistanceChange,
  onMaxDetourChange,
  onPreferredGradientChange,
}: Props) {
  return (
    <section className="settings-grid">
      {isLoop ? (
        <label>
          <span>
            <b>Длина кольца</b>
            <output>{targetDistanceKm} км</output>
          </span>
          <input
            type="range"
            min="5"
            max="100"
            step="1"
            value={targetDistanceKm}
            onChange={(event) => onTargetDistanceChange(Number(event.target.value))}
          />
        </label>
      ) : (
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
      )}
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

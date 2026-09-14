export default function ToggleSwitch({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`tt-toggle${checked ? ' is-checked' : ''}`}
    >
      <span className="tt-toggle__thumb" />
    </button>
  );
}

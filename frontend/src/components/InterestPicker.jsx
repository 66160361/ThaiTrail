const INTERESTS = [
  { id: 1, icon: '⛩️', labelTh: 'วัดและศาสนา',    labelEn: 'Temple' },
  { id: 2, icon: '🌿', labelTh: 'ธรรมชาติ',         labelEn: 'Nature' },
  { id: 3, icon: '🌊', labelTh: 'ทะเลและเกาะ',      labelEn: 'Sea' },
  { id: 4, icon: '🐘', labelTh: 'สัตว์ป่า',          labelEn: 'Wildlife' },
  { id: 5, icon: '📸', labelTh: 'ถ่ายภาพ',           labelEn: 'Photography' },
  { id: 6, icon: '🏛️', labelTh: 'ประวัติศาสตร์',    labelEn: 'History' },
  { id: 7, icon: '🍜', labelTh: 'อาหารและคาเฟ่',    labelEn: 'Food' },
  { id: 8, icon: '🎉', labelTh: 'ประเพณีและชุมชน',  labelEn: 'Community' },
];

/**
 * Interest picker grid for onboarding.
 * Props:
 *   selected   – array of selected category IDs
 *   onChange   – (ids: number[]) => void
 */
function InterestPicker({ selected = [], onChange }) {
  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onChange(next);
  };

  return (
    <div className="interest-grid">
      {INTERESTS.map(({ id, icon, labelTh, labelEn }) => (
        <button
          key={id}
          type="button"
          className={`interest-card${selected.includes(id) ? ' selected' : ''}`}
          onClick={() => toggle(id)}
          aria-pressed={selected.includes(id)}
        >
          <span className="interest-icon">{icon}</span>
          <span className="interest-label">{labelTh}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{labelEn}</span>
          {selected.includes(id) && (
            <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 14 }}>✓</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default InterestPicker;
export { INTERESTS };

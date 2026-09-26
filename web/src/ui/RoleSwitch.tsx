import type { Role } from '../data/types';

export const ROLES: { key: Role; icon: string; label: string }[] = [
  { key: 'owner', icon: '👨‍🌾', label: 'Besici' },
  { key: 'buyer', icon: '🤝', label: 'Alıcı' },
  { key: 'vet', icon: '🩺', label: 'Veteriner' },
  { key: 'coop', icon: '🏭', label: 'Kooperatif' },
];

export function RoleSwitch({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div className="role-seg" role="tablist" aria-label="Rol">
      {ROLES.map((r) => (
        <button key={r.key} className={value === r.key ? 'on' : ''} role="tab" aria-selected={value === r.key} onClick={() => onChange(r.key)}>
          <span>{r.icon}</span>
          {r.label}
        </button>
      ))}
    </div>
  );
}

import { Check, X } from 'lucide-react';

interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements = ({ password }: PasswordRequirementsProps) => {
  const requirements = [
    { label: '8 caractères minimum', valid: password.length >= 8 },
    { label: '1 majuscule (A-Z)', valid: /[A-Z]/.test(password) },
    { label: '1 minuscule (a-z)', valid: /[a-z]/.test(password) },
    { label: '1 chiffre (0-9)', valid: /[0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      {requirements.map((req, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 text-xs ${
            req.valid ? 'text-green-500' : 'text-muted-foreground'
          }`}
        >
          {req.valid ? (
            <Check className="h-3 w-3" />
          ) : (
            <X className="h-3 w-3" />
          )}
          <span>{req.label}</span>
        </div>
      ))}
    </div>
  );
};

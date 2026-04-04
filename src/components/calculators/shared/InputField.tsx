import { useState, type ChangeEvent } from 'react';
import { formatNumberWithCommas, parseNumberInput } from './formatUtils';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  isCurrency?: boolean;
  help?: string;
}

export default function InputField({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  isCurrency = false,
  help,
}: Props) {
  const [rawText, setRawText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = isFocused && !isCurrency
    ? rawText
    : isCurrency
      ? formatNumberWithCommas(value)
      : value === 0 ? '' : String(value);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (isCurrency) {
      const num = parseNumberInput(text);
      onChange(clamp(num, min, max));
    } else {
      setRawText(text);
      if (text === '' || text === '.' || text.endsWith('.')) return;
      const num = parseFloat(text);
      if (!isNaN(num)) {
        onChange(clamp(num, min, max));
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setRawText(value === 0 ? '' : String(value));
  };

  const handleBlur = () => {
    setIsFocused(false);
    setRawText('');
  };

  return (
    <div className="calc-input-group">
      <label className="calc-label">{label}</label>
      <div className="calc-input-wrapper">
        <input
          type="text"
          inputMode={isCurrency ? 'numeric' : 'decimal'}
          className="calc-input"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {suffix && <span className="calc-input-suffix">{suffix}</span>}
      </div>
      {help && <p className="calc-input-help">{help}</p>}
    </div>
  );
}

function clamp(value: number, min?: number, max?: number): number {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}

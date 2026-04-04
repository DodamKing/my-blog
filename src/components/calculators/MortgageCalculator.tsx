import { useState, type ChangeEvent } from 'react';
import InputField from './shared/InputField';
import ResultSummary from './shared/ResultSummary';
import ResultTable from './shared/ResultTable';
import { formatKRW, formatManWon } from './shared/formatUtils';
import {
  calcEqualPrincipalAndInterest,
  calcEqualPrincipal,
  calcSummary,
  type ScheduleEntry,
  type LoanSummary,
} from './shared/loanMath';
import './shared/calculator.css';

type Method = 'equal-payment' | 'equal-principal';

const METHOD_LABELS: Record<Method, string> = {
  'equal-payment': '원리금균등',
  'equal-principal': '원금균등',
};

const CALC_FN: Record<Method, typeof calcEqualPrincipalAndInterest> = {
  'equal-payment': calcEqualPrincipalAndInterest,
  'equal-principal': calcEqualPrincipal,
};

interface LtvPreset {
  label: string;
  ltv: number;
}

const LTV_PRESETS: LtvPreset[] = [
  { label: '투기과열지구 (40%)', ltv: 40 },
  { label: '조정대상지역 (50%)', ltv: 50 },
  { label: '비규제지역 (70%)', ltv: 70 },
  { label: '생애최초 (80%)', ltv: 80 },
  { label: '직접 입력', ltv: 0 },
];

export default function MortgageCalculator() {
  const [propertyValue, setPropertyValue] = useState(500000000);
  const [ltvPreset, setLtvPreset] = useState(2);
  const [customLtv, setCustomLtv] = useState(70);
  const [rate, setRate] = useState(3.8);
  const [years, setYears] = useState(30);
  const [method, setMethod] = useState<Method>('equal-payment');
  const [annualIncome, setAnnualIncome] = useState(50000000);
  const [calculated, setCalculated] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [summary, setSummary] = useState<LoanSummary | null>(null);

  const currentLtv = LTV_PRESETS[ltvPreset].ltv || customLtv;
  const maxLoan = Math.floor(propertyValue * currentLtv / 100);

  const calculate = () => {
    const input = { principal: maxLoan, annualRate: rate, termMonths: years * 12 };
    const result = CALC_FN[method](input);
    setSchedule(result);
    setSummary(calcSummary(result));
    setCalculated(true);
  };

  const dsrRatio = summary
    ? (summary.monthlyPaymentFirst * 12 / annualIncome * 100)
    : 0;

  return (
    <div className="calc-container">
      <div className="calc-inputs">
        <InputField
          label="주택 가격"
          value={propertyValue}
          onChange={setPropertyValue}
          suffix="원"
          isCurrency
        />
        <div className="calc-input-group">
          <label className="calc-label">LTV 규제지역</label>
          <select
            className="calc-select"
            value={ltvPreset}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setLtvPreset(Number(e.target.value))}
          >
            {LTV_PRESETS.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
        </div>
        {LTV_PRESETS[ltvPreset].ltv === 0 && (
          <InputField
            label="LTV 비율"
            value={customLtv}
            onChange={(v) => setCustomLtv(Math.min(100, Math.round(v)))}
            suffix="%"
            min={1}
            max={100}
          />
        )}
        <div className="calc-input-group calc-input-group--full">
          <div className="calc-ltv-result">
            대출 가능 금액: <strong>{formatManWon(maxLoan)}</strong>
            <span className="calc-ltv-detail"> (LTV {currentLtv}%)</span>
          </div>
        </div>
        <InputField
          label="연 이자율"
          value={rate}
          onChange={setRate}
          suffix="%"
          min={0}
          max={20}
        />
        <InputField
          label="대출 기간"
          value={years}
          onChange={(v) => setYears(Math.round(v))}
          suffix="년"
          min={1}
          max={40}
        />
        <div className="calc-input-group">
          <label className="calc-label">상환 방식</label>
          <select
            className="calc-select"
            value={method}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setMethod(e.target.value as Method)}
          >
            {(Object.keys(METHOD_LABELS) as Method[]).map((m) => (
              <option key={m} value={m}>{METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>
        <InputField
          label="연 소득 (DSR 확인용)"
          value={annualIncome}
          onChange={setAnnualIncome}
          suffix="원"
          isCurrency
        />
      </div>

      <button className="calc-button" onClick={calculate}>
        계산하기
      </button>

      {calculated && summary && (
        <>
          <ResultSummary
            summary={summary}
            principal={maxLoan}
            showRange={method === 'equal-principal'}
          />

          <div className={`calc-dsr-box ${dsrRatio > 40 ? 'calc-dsr-box--warn' : 'calc-dsr-box--ok'}`}>
            <span className="calc-dsr-label">DSR (총부채원리금상환비율)</span>
            <span className="calc-dsr-value">{dsrRatio.toFixed(1)}%</span>
            <span className="calc-dsr-msg">
              {dsrRatio > 40
                ? '⚠️ DSR 40%를 초과합니다. 대출 승인이 어려울 수 있습니다.'
                : '✅ DSR 40% 이내로 대출 가능 범위입니다.'}
            </span>
          </div>

          <ResultTable schedule={schedule} />
        </>
      )}
    </div>
  );
}

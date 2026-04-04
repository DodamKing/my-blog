import { useState, type ChangeEvent } from 'react';
import InputField from './shared/InputField';
import ResultSummary from './shared/ResultSummary';
import ResultTable from './shared/ResultTable';
import { formatKRW, formatManWon } from './shared/formatUtils';
import {
  calcEqualPrincipalAndInterest,
  calcEqualPrincipal,
  calcBulletRepayment,
  calcSummary,
  type ScheduleEntry,
  type LoanSummary,
} from './shared/loanMath';
import './shared/calculator.css';

type Method = 'equal-payment' | 'equal-principal' | 'bullet';

const METHOD_LABELS: Record<Method, string> = {
  'equal-payment': '원리금균등',
  'equal-principal': '원금균등',
  'bullet': '만기일시상환',
};

const CALC_FN: Record<Method, typeof calcEqualPrincipalAndInterest> = {
  'equal-payment': calcEqualPrincipalAndInterest,
  'equal-principal': calcEqualPrincipal,
  'bullet': calcBulletRepayment,
};

export default function LoanCalculator() {
  const [principal, setPrincipal] = useState(100000000);
  const [rate, setRate] = useState(4.5);
  const [years, setYears] = useState(30);
  const [method, setMethod] = useState<Method>('equal-payment');
  const [showCompare, setShowCompare] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [summary, setSummary] = useState<LoanSummary | null>(null);

  const calculate = () => {
    const input = { principal, annualRate: rate, termMonths: years * 12 };
    const result = CALC_FN[method](input);
    setSchedule(result);
    setSummary(calcSummary(result));
    setCalculated(true);
  };

  const getCompareData = () => {
    const input = { principal, annualRate: rate, termMonths: years * 12 };
    return (Object.keys(METHOD_LABELS) as Method[]).map((m) => {
      const s = calcSummary(CALC_FN[m](input));
      return { method: m, label: METHOD_LABELS[m], ...s };
    });
  };

  const compareData = calculated ? getCompareData() : [];
  const minInterest = compareData.length > 0
    ? Math.min(...compareData.map((d) => d.totalInterest))
    : 0;

  return (
    <div className="calc-container">
      <div className="calc-inputs">
        <InputField
          label="대출 금액"
          value={principal}
          onChange={setPrincipal}
          suffix="원"
          isCurrency
          help="예: 1억 = 100,000,000"
        />
        <InputField
          label="연 이자율"
          value={rate}
          onChange={setRate}
          suffix="%"
          min={0}
          max={30}
        />
        <InputField
          label="대출 기간"
          value={years}
          onChange={(v) => setYears(Math.round(v))}
          suffix="년"
          min={1}
          max={50}
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
      </div>

      <button className="calc-button" onClick={calculate}>
        계산하기
      </button>

      {calculated && summary && (
        <>
          <ResultSummary
            summary={summary}
            principal={principal}
            showRange={method === 'equal-principal'}
          />

          <div style={{ marginBottom: '1.5rem' }}>
            <button
              className={`calc-tab ${showCompare ? 'calc-tab--active' : ''}`}
              onClick={() => setShowCompare(!showCompare)}
            >
              상환방식별 비교
            </button>
          </div>

          {showCompare && (
            <div className="calc-compare">
              <h3>상환방식별 비교</h3>
              <table>
                <thead>
                  <tr>
                    <th>상환방식</th>
                    <th>월 상환액</th>
                    <th>총 이자</th>
                    <th>총 상환액</th>
                  </tr>
                </thead>
                <tbody>
                  {compareData.map((d) => (
                    <tr key={d.method}>
                      <td>{d.label}</td>
                      <td>{formatKRW(d.monthlyPaymentFirst)}</td>
                      <td className={d.totalInterest === minInterest ? 'calc-compare-best' : ''}>
                        {formatManWon(d.totalInterest)}
                      </td>
                      <td>{formatManWon(d.totalPayment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ResultTable schedule={schedule} />
        </>
      )}
    </div>
  );
}

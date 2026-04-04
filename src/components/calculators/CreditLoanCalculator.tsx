import { useState, type ChangeEvent } from 'react';
import InputField from './shared/InputField';
import ResultSummary from './shared/ResultSummary';
import ResultTable from './shared/ResultTable';
import { formatKRW, formatManWon } from './shared/formatUtils';
import {
  calcEqualPrincipalAndInterest,
  calcBulletRepayment,
  calcSummary,
  type ScheduleEntry,
  type LoanSummary,
} from './shared/loanMath';
import './shared/calculator.css';

type Method = 'equal-payment' | 'bullet';

const METHOD_LABELS: Record<Method, string> = {
  'equal-payment': '원리금균등',
  'bullet': '만기일시상환',
};

const CALC_FN: Record<Method, typeof calcEqualPrincipalAndInterest> = {
  'equal-payment': calcEqualPrincipalAndInterest,
  'bullet': calcBulletRepayment,
};

export default function CreditLoanCalculator() {
  const [principal, setPrincipal] = useState(30000000);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(3);
  const [method, setMethod] = useState<Method>('equal-payment');
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

  const getTermCompare = () => {
    return [1, 2, 3, 5].map((y) => {
      const input = { principal, annualRate: rate, termMonths: y * 12 };
      const s = calcSummary(CALC_FN[method](input));
      return { years: y, ...s };
    });
  };

  return (
    <div className="calc-container">
      <div className="calc-inputs">
        <InputField
          label="대출 금액"
          value={principal}
          onChange={setPrincipal}
          suffix="원"
          isCurrency
          help="신용대출은 보통 1억원 이내"
        />
        <InputField
          label="연 이자율"
          value={rate}
          onChange={setRate}
          suffix="%"
          min={0}
          max={30}
          help="신용대출 금리: 보통 4~12%"
        />
        <InputField
          label="대출 기간"
          value={years}
          onChange={(v) => setYears(Math.round(v))}
          suffix="년"
          min={1}
          max={10}
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
          />

          <div className="calc-compare">
            <h3>기간별 총 이자 비교</h3>
            <table>
              <thead>
                <tr>
                  <th>기간</th>
                  <th>월 상환액</th>
                  <th>총 이자</th>
                  <th>총 상환액</th>
                </tr>
              </thead>
              <tbody>
                {getTermCompare().map((d) => {
                  const isCurrent = d.years === years;
                  return (
                    <tr key={d.years}>
                      <td>{d.years}년</td>
                      <td>{formatKRW(d.monthlyPaymentFirst)}</td>
                      <td className={isCurrent ? 'calc-compare-best' : ''}>
                        {formatManWon(d.totalInterest)}
                      </td>
                      <td>{formatManWon(d.totalPayment)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ResultTable schedule={schedule} />
        </>
      )}
    </div>
  );
}

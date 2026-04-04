import { useState } from 'react';
import InputField from './shared/InputField';
import ResultTable from './shared/ResultTable';
import { formatKRW, formatManWon } from './shared/formatUtils';
import {
  calcBulletRepayment,
  calcSummary,
  type ScheduleEntry,
} from './shared/loanMath';
import './shared/calculator.css';

export default function JeonseLoanCalculator() {
  const [deposit, setDeposit] = useState(300000000);
  const [loanRatio, setLoanRatio] = useState(80);
  const [rate, setRate] = useState(3.5);
  const [years, setYears] = useState(2);
  const [calculated, setCalculated] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);

  const loanAmount = Math.floor(deposit * loanRatio / 100);

  const calculate = () => {
    const result = calcBulletRepayment({
      principal: loanAmount,
      annualRate: rate,
      termMonths: years * 12,
    });
    setSchedule(result);
    setCalculated(true);
  };

  const summary = calculated ? calcSummary(schedule) : null;

  return (
    <div className="calc-container">
      <div className="calc-inputs">
        <InputField
          label="전세 보증금"
          value={deposit}
          onChange={setDeposit}
          suffix="원"
          isCurrency
        />
        <InputField
          label="대출 비율"
          value={loanRatio}
          onChange={(v) => setLoanRatio(Math.min(100, Math.round(v)))}
          suffix="%"
          min={1}
          max={100}
          help="보통 보증금의 70~80%"
        />
        <div className="calc-input-group calc-input-group--full">
          <div className="calc-ltv-result">
            대출 금액: <strong>{formatManWon(loanAmount)}</strong>
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
          max={10}
          help="전세대출은 보통 2년"
        />
      </div>

      <button className="calc-button" onClick={calculate}>
        계산하기
      </button>

      {calculated && summary && (
        <>
          <div className="calc-result-cards">
            <div className="calc-result-card calc-result-card--primary">
              <span className="calc-result-label">월 이자</span>
              <span className="calc-result-value">{formatKRW(summary.monthlyPaymentFirst)}</span>
              <span className="calc-result-sub">매월 납입하는 이자</span>
            </div>
            <div className="calc-result-card">
              <span className="calc-result-label">총 이자 ({years}년)</span>
              <span className="calc-result-value">{formatManWon(summary.totalInterest)}</span>
            </div>
            <div className="calc-result-card">
              <span className="calc-result-label">만기 시 상환액</span>
              <span className="calc-result-value">{formatManWon(loanAmount)}</span>
              <span className="calc-result-sub">원금 일시상환</span>
            </div>
          </div>

          <div className="calc-compare">
            <h3>기간별 총 이자 비교</h3>
            <table>
              <thead>
                <tr>
                  <th>기간</th>
                  <th>월 이자</th>
                  <th>총 이자</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((y) => {
                  const s = calcSummary(calcBulletRepayment({
                    principal: loanAmount,
                    annualRate: rate,
                    termMonths: y * 12,
                  }));
                  return (
                    <tr key={y}>
                      <td>{y}년</td>
                      <td>{formatKRW(s.monthlyPaymentFirst)}</td>
                      <td className={y === years ? 'calc-compare-best' : ''}>
                        {formatManWon(s.totalInterest)}
                      </td>
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

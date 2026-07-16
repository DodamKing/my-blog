import { useState } from 'react';
import InputField from './shared/InputField';
import { formatKRW, formatManWon } from './shared/formatUtils';
import './shared/calculator.css';

/**
 * 중도상환수수료 = 중도상환금액 × 수수료율 × (잔여기간 ÷ 수수료 부과기간)
 * 부과기간이 지나면 면제되므로 잔여기간은 0 미만으로 내려가지 않는다.
 * 요율·부과기간은 상품마다 달라 하드코딩하지 않고 전부 입력값으로 받는다.
 */
function calcPrepaymentFee({
  amount,
  ratePercent,
  elapsedMonths,
  feePeriodMonths,
}: {
  amount: number;
  ratePercent: number;
  elapsedMonths: number;
  feePeriodMonths: number;
}) {
  if (feePeriodMonths <= 0) {
    return { fee: 0, remainingMonths: 0, effectiveRate: 0, exempt: true };
  }

  const remainingMonths = Math.max(0, feePeriodMonths - elapsedMonths);
  const exempt = remainingMonths === 0;
  const effectiveRate = (ratePercent * remainingMonths) / feePeriodMonths;
  const fee = Math.floor((amount * effectiveRate) / 100);

  return { fee, remainingMonths, effectiveRate, exempt };
}

export default function PrepaymentFeeCalculator() {
  const [amount, setAmount] = useState(50000000);
  const [ratePercent, setRatePercent] = useState(1.2);
  const [elapsedMonths, setElapsedMonths] = useState(12);
  const [feePeriodMonths, setFeePeriodMonths] = useState(36);
  const [calculated, setCalculated] = useState(false);

  const result = calcPrepaymentFee({
    amount,
    ratePercent,
    elapsedMonths,
    feePeriodMonths,
  });

  const monthsToExempt = result.remainingMonths;
  const exemptYears = Math.floor(monthsToExempt / 12);
  const exemptMonths = monthsToExempt % 12;

  return (
    <div className="calc-container">
      <div className="calc-inputs">
        <InputField
          label="중도상환 금액"
          value={amount}
          onChange={setAmount}
          suffix="원"
          isCurrency
          help="이번에 갚으려는 금액"
        />
        <InputField
          label="중도상환수수료율"
          value={ratePercent}
          onChange={setRatePercent}
          suffix="%"
          min={0}
          max={10}
          step={0.1}
          help="대출 약정서에 표기됨 (보통 0.5~1.5%)"
        />
        <InputField
          label="대출 경과 기간"
          value={elapsedMonths}
          onChange={(v) => setElapsedMonths(Math.max(0, Math.round(v)))}
          suffix="개월"
          min={0}
          max={120}
          help="대출 실행일부터 오늘까지"
        />
        <InputField
          label="수수료 부과 기간"
          value={feePeriodMonths}
          onChange={(v) => setFeePeriodMonths(Math.max(1, Math.round(v)))}
          suffix="개월"
          min={1}
          max={120}
          help="이 기간이 지나면 면제 (보통 36개월)"
        />
      </div>

      <button className="calc-button" onClick={() => setCalculated(true)}>
        계산하기
      </button>

      {calculated && (
        <>
          <div className="calc-result-cards">
            <div className="calc-result-card calc-result-card--primary">
              <span className="calc-result-label">예상 중도상환수수료</span>
              <span className="calc-result-value">{formatKRW(result.fee)}</span>
              <span className="calc-result-sub">
                {result.exempt
                  ? '부과 기간이 지나 면제됩니다'
                  : `적용 요율 ${result.effectiveRate.toFixed(3)}%`}
              </span>
            </div>
            <div className="calc-result-card">
              <span className="calc-result-label">면제까지</span>
              <span className="calc-result-value">
                {result.exempt
                  ? '면제'
                  : exemptYears > 0
                    ? `${exemptYears}년 ${exemptMonths}개월`
                    : `${exemptMonths}개월`}
              </span>
              <span className="calc-result-sub">
                {result.exempt ? '지금 갚아도 수수료 없음' : '이 기간 뒤엔 수수료 0원'}
              </span>
            </div>
            <div className="calc-result-card">
              <span className="calc-result-label">기다렸다 갚으면</span>
              <span className="calc-result-value">
                {result.exempt ? '0원' : formatManWon(result.fee)}
              </span>
              <span className="calc-result-sub">
                {result.exempt ? '이미 면제 상태' : '아끼는 수수료'}
              </span>
            </div>
          </div>

          <div className="calc-compare">
            <h3>경과 기간별 수수료 — 언제 갚으면 얼마인가</h3>
            <div className="calc-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>경과 기간</th>
                    <th>적용 요율</th>
                    <th>수수료</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    { length: Math.floor(feePeriodMonths / 6) + 1 },
                    (_, i) => i * 6
                  ).map((m) => {
                    const r = calcPrepaymentFee({
                      amount,
                      ratePercent,
                      elapsedMonths: m,
                      feePeriodMonths,
                    });
                    const isCurrent =
                      m <= elapsedMonths && elapsedMonths < m + 6;
                    return (
                      <tr key={m}>
                        <td>
                          {m}개월{m === feePeriodMonths ? ' (면제)' : ''}
                        </td>
                        <td>{r.effectiveRate.toFixed(3)}%</td>
                        <td className={isCurrent ? 'calc-compare-best' : ''}>
                          {formatKRW(r.fee)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

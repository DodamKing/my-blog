import { formatKRW, formatManWon } from './formatUtils';
import type { LoanSummary } from './loanMath';

interface Props {
  summary: LoanSummary;
  principal: number;
  showRange?: boolean;
}

export default function ResultSummary({ summary, principal, showRange = false }: Props) {
  const { monthlyPaymentFirst, monthlyPaymentLast, totalInterest, totalPayment } = summary;

  return (
    <div className="calc-result-cards">
      <div className="calc-result-card calc-result-card--primary">
        <span className="calc-result-label">
          {showRange ? '첫 달 상환액' : '월 상환액'}
        </span>
        <span className="calc-result-value">{formatKRW(monthlyPaymentFirst)}</span>
        {showRange && monthlyPaymentFirst !== monthlyPaymentLast && (
          <span className="calc-result-sub">
            마지막 달: {formatKRW(monthlyPaymentLast)}
          </span>
        )}
      </div>
      <div className="calc-result-card">
        <span className="calc-result-label">총 이자</span>
        <span className="calc-result-value">{formatManWon(totalInterest)}</span>
      </div>
      <div className="calc-result-card">
        <span className="calc-result-label">총 상환액</span>
        <span className="calc-result-value">{formatManWon(totalPayment)}</span>
        <span className="calc-result-sub">
          원금 {formatManWon(principal)}
        </span>
      </div>
    </div>
  );
}

import { useState, Fragment } from 'react';
import { formatKRW } from './formatUtils';
import type { ScheduleEntry } from './loanMath';

interface Props {
  schedule: ScheduleEntry[];
}

const PREVIEW_COUNT = 12;

export default function ResultTable({ schedule }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (schedule.length === 0) return null;

  const needsTruncation = schedule.length > PREVIEW_COUNT * 2;
  const displayRows = expanded || !needsTruncation
    ? schedule
    : [...schedule.slice(0, PREVIEW_COUNT), ...schedule.slice(-PREVIEW_COUNT)];

  return (
    <div className="calc-table-wrapper">
      <h3 className="calc-table-title">상환 스케줄</h3>
      <div className="calc-table-scroll">
        <table className="calc-table">
          <thead>
            <tr>
              <th>회차</th>
              <th>상환액</th>
              <th>원금</th>
              <th>이자</th>
              <th>잔금</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((entry, idx) => (
              <Fragment key={entry.month}>
                {!expanded && needsTruncation && idx === PREVIEW_COUNT && (
                  <tr key="gap">
                    <td colSpan={5} className="calc-table-gap-cell">
                      <button
                        className="calc-table-expand"
                        onClick={() => setExpanded(true)}
                      >
                        ··· {schedule.length - PREVIEW_COUNT * 2}개월 더 보기 ···
                      </button>
                    </td>
                  </tr>
                )}
                <tr key={entry.month}>
                  <td>{entry.month}회</td>
                  <td>{formatKRW(entry.payment)}</td>
                  <td>{formatKRW(entry.principal)}</td>
                  <td>{formatKRW(entry.interest)}</td>
                  <td>{formatKRW(entry.remainingBalance)}</td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

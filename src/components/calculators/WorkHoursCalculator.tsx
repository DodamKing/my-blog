import { useMemo, useState } from 'react';
import InputField from './shared/InputField';
import './shared/calculator.css';

function parseTime(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function fmtDuration(totalMin: number): string {
  if (totalMin <= 0) return '0분';
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export default function WorkHoursCalculator() {
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [breakMin, setBreakMin] = useState(60);
  const [days, setDays] = useState(5);

  const result = useMemo(() => {
    const s = parseTime(start);
    const e = parseTime(end);
    if (s === null || e === null) return null;
    let gross = e - s;
    if (gross <= 0) gross += 1440; // 자정을 넘기는 야간 근무
    const net = Math.max(0, gross - Math.max(0, breakMin));
    const weekly = net * Math.max(0, days);
    const monthly = Math.round(weekly * 4.345); // 주 → 월 환산 계수
    return { gross, net, weekly, monthly };
  }, [start, end, breakMin, days]);

  return (
    <div className="calc-container">
      <div className="calc-inputs">
        <div className="calc-input-group">
          <label className="calc-label">출근 시각</label>
          <div className="calc-input-wrapper">
            <input
              type="time"
              className="calc-input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
        </div>
        <div className="calc-input-group">
          <label className="calc-label">퇴근 시각</label>
          <div className="calc-input-wrapper">
            <input
              type="time"
              className="calc-input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        <InputField
          label="휴게 시간"
          value={breakMin}
          onChange={setBreakMin}
          suffix="분"
          min={0}
          max={1440}
          help="근로기준법: 4시간당 30분, 8시간당 1시간 이상"
        />
        <InputField
          label="주 근무일수"
          value={days}
          onChange={(v) => setDays(Math.min(7, Math.round(v)))}
          suffix="일"
          min={1}
          max={7}
        />
      </div>

      {result && (
        <>
          <div className="calc-result-cards">
            <div className="calc-result-card calc-result-card--primary">
              <span className="calc-result-label">일 실근무시간</span>
              <span className="calc-result-value">{fmtDuration(result.net)}</span>
              <span className="calc-result-sub">
                총 체류 {fmtDuration(result.gross)} · 휴게 {breakMin}분 제외
              </span>
            </div>
            <div className="calc-result-card">
              <span className="calc-result-label">주 실근무시간</span>
              <span className="calc-result-value">{fmtDuration(result.weekly)}</span>
              <span className="calc-result-sub">{days}일 기준</span>
            </div>
            <div className="calc-result-card">
              <span className="calc-result-label">월 실근무시간</span>
              <span className="calc-result-value">{fmtDuration(result.monthly)}</span>
              <span className="calc-result-sub">주 × 4.345 환산</span>
            </div>
          </div>

          {result.weekly > 40 * 60 && (
            <div className="calc-dsr-box calc-dsr-box--warn">
              <span className="calc-dsr-label">주 40시간 초과</span>
              <span className="calc-dsr-value">+{fmtDuration(result.weekly - 40 * 60)}</span>
              <span className="calc-dsr-msg">
                초과분은 연장근로로 통상시급의 1.5배 가산 대상일 수 있습니다. 실제 수당은
                근로계약·사업장 규정을 확인하세요.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

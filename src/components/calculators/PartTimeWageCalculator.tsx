import { useMemo, useState } from 'react';
import InputField from './shared/InputField';
import { formatKRW } from './shared/formatUtils';
import './shared/calculator.css';

const WEEKS_PER_MONTH = 4.345; // 주 → 월 환산 계수
const HOLIDAY_PAY_THRESHOLD = 15; // 주휴수당 발생 최소 주 소정근로시간
const FULL_WEEK_HOURS = 40;
const WITHHOLDING_RATE = 0.033; // 사업소득 원천징수 3.3%

export default function PartTimeWageCalculator() {
  const [hourlyWage, setHourlyWage] = useState(10000);
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [withholding, setWithholding] = useState(false);

  const result = useMemo(() => {
    const weeklyHours = hoursPerDay * daysPerWeek;

    // 주휴수당: 주 15시간 이상 근무 시 발생. 40시간 미만은 비례 지급.
    const holidayPay =
      weeklyHours >= HOLIDAY_PAY_THRESHOLD
        ? (Math.min(weeklyHours, FULL_WEEK_HOURS) / FULL_WEEK_HOURS) * 8 * hourlyWage
        : 0;

    const dailyPay = hourlyWage * hoursPerDay;
    const weeklyBase = hourlyWage * weeklyHours;
    const weeklyGross = weeklyBase + holidayPay;
    const monthlyGross = weeklyGross * WEEKS_PER_MONTH;
    const rate = withholding ? WITHHOLDING_RATE : 0;

    return {
      weeklyHours,
      holidayPay,
      dailyPay,
      weeklyGross,
      monthlyGross,
      weeklyNet: weeklyGross * (1 - rate),
      monthlyNet: monthlyGross * (1 - rate),
      deducted: monthlyGross * rate,
    };
  }, [hourlyWage, hoursPerDay, daysPerWeek, withholding]);

  return (
    <div className="calc-container">
      <div className="calc-inputs">
        <InputField
          label="시급"
          value={hourlyWage}
          onChange={setHourlyWage}
          suffix="원"
          min={0}
          max={1000000}
          isCurrency
          help="최저임금은 매년 새로 고시됩니다. 최신 고시액을 확인해 입력하세요."
        />
        <InputField
          label="하루 근무시간"
          value={hoursPerDay}
          onChange={setHoursPerDay}
          suffix="시간"
          min={0}
          max={24}
          help="휴게시간을 뺀 실근무시간"
        />
        <InputField
          label="주 근무일수"
          value={daysPerWeek}
          onChange={(v) => setDaysPerWeek(Math.min(7, Math.round(v)))}
          suffix="일"
          min={1}
          max={7}
        />
        <div className="calc-input-group">
          <label className="calc-label">세금 공제</label>
          <select
            className="calc-select"
            value={withholding ? 'withholding' : 'none'}
            onChange={(e) => setWithholding(e.target.value === 'withholding')}
          >
            <option value="none">공제 없음 (세전)</option>
            <option value="withholding">3.3% 원천징수</option>
          </select>
          <p className="calc-input-help">4대보험 가입 사업장은 요율이 달라 별도 확인이 필요합니다.</p>
        </div>
      </div>

      <div className="calc-result-cards">
        <div className="calc-result-card calc-result-card--primary">
          <span className="calc-result-label">월 예상 급여</span>
          <span className="calc-result-value">{formatKRW(result.monthlyNet)}</span>
          <span className="calc-result-sub">
            주 {result.weeklyHours}시간 · 주급 × {WEEKS_PER_MONTH} 환산
            {withholding && ` · 3.3% ${formatKRW(result.deducted)} 공제`}
          </span>
        </div>
        <div className="calc-result-card">
          <span className="calc-result-label">주급</span>
          <span className="calc-result-value">{formatKRW(result.weeklyNet)}</span>
          <span className="calc-result-sub">
            {result.holidayPay > 0 ? '주휴수당 포함' : '주휴수당 미발생'}
          </span>
        </div>
        <div className="calc-result-card">
          <span className="calc-result-label">일급</span>
          <span className="calc-result-value">{formatKRW(result.dailyPay)}</span>
          <span className="calc-result-sub">{hoursPerDay}시간 기준</span>
        </div>
      </div>

      {result.holidayPay > 0 ? (
        <div className="calc-dsr-box calc-dsr-box--ok">
          <span className="calc-dsr-label">주휴수당 (주 1회)</span>
          <span className="calc-dsr-value">{formatKRW(result.holidayPay)}</span>
          <span className="calc-dsr-msg">
            주 소정근로시간이 15시간 이상이라 주휴수당이 발생합니다. 위 주급·월급에 이미 포함된
            금액입니다. 결근 없이 소정근로일을 모두 채운 주에 지급됩니다.
          </span>
        </div>
      ) : (
        <div className="calc-dsr-box calc-dsr-box--warn">
          <span className="calc-dsr-label">주휴수당 미발생</span>
          <span className="calc-dsr-value">주 {result.weeklyHours}시간</span>
          <span className="calc-dsr-msg">
            주 소정근로시간이 15시간 미만이면 주휴수당이 발생하지 않습니다. 15시간을 넘기면 하루치
            임금이 추가로 붙습니다.
          </span>
        </div>
      )}
    </div>
  );
}

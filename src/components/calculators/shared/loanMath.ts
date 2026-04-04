export interface ScheduleEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface LoanSummary {
  monthlyPaymentFirst: number;
  monthlyPaymentLast: number;
  totalInterest: number;
  totalPayment: number;
}

interface LoanInput {
  principal: number;
  annualRate: number;
  termMonths: number;
}

/** 원리금균등상환 */
export function calcEqualPrincipalAndInterest({
  principal,
  annualRate,
  termMonths,
}: LoanInput): ScheduleEntry[] {
  const monthlyRate = annualRate / 100 / 12;
  const schedule: ScheduleEntry[] = [];
  let remaining = principal;

  if (monthlyRate === 0) {
    const monthly = principal / termMonths;
    for (let m = 1; m <= termMonths; m++) {
      remaining -= monthly;
      schedule.push({
        month: m,
        payment: monthly,
        principal: monthly,
        interest: 0,
        remainingBalance: Math.max(0, remaining),
      });
    }
    return schedule;
  }

  const monthly =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  for (let m = 1; m <= termMonths; m++) {
    const interest = remaining * monthlyRate;
    const principalPart = monthly - interest;
    remaining -= principalPart;
    schedule.push({
      month: m,
      payment: Math.round(monthly),
      principal: Math.round(principalPart),
      interest: Math.round(interest),
      remainingBalance: Math.max(0, Math.round(remaining)),
    });
  }
  return schedule;
}

/** 원금균등상환 */
export function calcEqualPrincipal({
  principal,
  annualRate,
  termMonths,
}: LoanInput): ScheduleEntry[] {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPrincipal = principal / termMonths;
  const schedule: ScheduleEntry[] = [];
  let remaining = principal;

  for (let m = 1; m <= termMonths; m++) {
    const interest = remaining * monthlyRate;
    const payment = monthlyPrincipal + interest;
    remaining -= monthlyPrincipal;
    schedule.push({
      month: m,
      payment: Math.round(payment),
      principal: Math.round(monthlyPrincipal),
      interest: Math.round(interest),
      remainingBalance: Math.max(0, Math.round(remaining)),
    });
  }
  return schedule;
}

/** 만기일시상환 */
export function calcBulletRepayment({
  principal,
  annualRate,
  termMonths,
}: LoanInput): ScheduleEntry[] {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyInterest = principal * monthlyRate;
  const schedule: ScheduleEntry[] = [];

  for (let m = 1; m <= termMonths; m++) {
    const isLast = m === termMonths;
    schedule.push({
      month: m,
      payment: Math.round(isLast ? monthlyInterest + principal : monthlyInterest),
      principal: Math.round(isLast ? principal : 0),
      interest: Math.round(monthlyInterest),
      remainingBalance: Math.round(isLast ? 0 : principal),
    });
  }
  return schedule;
}

/** 스케줄에서 요약 정보 추출 */
export function calcSummary(schedule: ScheduleEntry[]): LoanSummary {
  if (schedule.length === 0) {
    return { monthlyPaymentFirst: 0, monthlyPaymentLast: 0, totalInterest: 0, totalPayment: 0 };
  }
  const totalInterest = schedule.reduce((sum, e) => sum + e.interest, 0);
  const totalPayment = schedule.reduce((sum, e) => sum + e.payment, 0);
  return {
    monthlyPaymentFirst: schedule[0].payment,
    monthlyPaymentLast: schedule[schedule.length - 1].payment,
    totalInterest,
    totalPayment,
  };
}

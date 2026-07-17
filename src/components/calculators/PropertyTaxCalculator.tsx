import { useState } from 'react';
import InputField from './shared/InputField';
import { formatKRW, formatManWon } from './shared/formatUtils';
import './shared/calculator.css';

/**
 * 주택(아파트) 재산세 계산 — 지방세법 기준
 *
 *   과세표준   = 공시가격 × 공정시장가액비율
 *   재산세 본세 = 과세표준 × 세율 − 누진공제
 *   도시지역분  = 과세표준 × 0.14%          (지방세법 제112조)
 *   지방교육세  = 재산세 본세 × 20%          (제151조, 도시지역분 제외)
 *
 * 9억원 기준이 두 제도에 각각 다르게 걸린다 — 섞으면 고가 1주택이 틀린다:
 *   - 세율 특례(제111조의2): 공시가격 9억 이하만
 *   - 공정시장가액비율 특례(시행령 제109조): 9억 초과 1주택도 45% 적용
 *
 * 세부담상한(105~130%)은 주택에 대해 폐지(제122조 단서, 2024.1.1.)되어
 * 과세표준상한제(제110조 제3항, 상한율 5%)로 대체됐다. 옛 상한을 쓰면 안 된다.
 *
 * 지역자원시설세는 공시가격이 아니라 지자체가 별도 산정하는 건축물분
 * 시가표준액을 기준으로 해 공시가격만으로 도출할 수 없다 — 합계에서 제외한다.
 */

const 공정시장가액비율_다주택 = 0.6;
const 도시지역분_세율 = 0.0014;
const 지방교육세_비율 = 0.2;
const 과세표준상한율 = 0.05;
const 세율특례_공시가격_상한 = 900_000_000;
const 분할부과_기준_세액 = 200_000;

/** 1세대 1주택 공정시장가액비율 — 공시가격 구간별 (9억 초과여도 45% 적용) */
function 공정시장가액비율(공시가격: number, 일주택: boolean): number {
  if (!일주택) return 공정시장가액비율_다주택;
  if (공시가격 <= 300_000_000) return 0.43;
  if (공시가격 <= 600_000_000) return 0.44;
  return 0.45;
}

/** [과세표준 상한, 세율, 누진공제] */
const 표준세율표: [number, number, number][] = [
  [60_000_000, 0.001, 0],
  [150_000_000, 0.0015, 30_000],
  [300_000_000, 0.0025, 180_000],
  [Infinity, 0.004, 630_000],
];

const 특례세율표: [number, number, number][] = [
  [60_000_000, 0.0005, 0],
  [150_000_000, 0.001, 30_000],
  [300_000_000, 0.002, 180_000],
  [Infinity, 0.0035, 630_000],
];

function 본세계산(과세표준: number, 특례적용: boolean) {
  const 표 = 특례적용 ? 특례세율표 : 표준세율표;
  const [, 세율, 누진공제] = 표.find(([상한]) => 과세표준 <= 상한)!;
  return {
    본세: Math.max(0, 과세표준 * 세율 - 누진공제),
    세율,
    누진공제,
  };
}

interface Params {
  공시가격: number;
  일주택: boolean;
  도시지역: boolean;
  전년공시가격: number;
}

function calcPropertyTax({ 공시가격, 일주택, 도시지역, 전년공시가격 }: Params) {
  const 비율 = 공정시장가액비율(공시가격, 일주택);
  const 산출과세표준 = 공시가격 * 비율;

  // 과세표준상한제 — 전년도 공시가격을 입력한 경우에만 적용
  let 과세표준 = 산출과세표준;
  let 상한적용 = false;
  if (전년공시가격 > 0) {
    const 직전연도_과세표준_상당액 = 전년공시가격 * 비율;
    const 과세표준상한액 = 직전연도_과세표준_상당액 + 산출과세표준 * 과세표준상한율;
    if (과세표준상한액 < 산출과세표준) {
      과세표준 = 과세표준상한액;
      상한적용 = true;
    }
  }

  const 특례적용 = 일주택 && 공시가격 <= 세율특례_공시가격_상한;
  const { 본세, 세율 } = 본세계산(과세표준, 특례적용);
  const 도시지역분 = 도시지역 ? 과세표준 * 도시지역분_세율 : 0;
  const 지방교육세 = 본세 * 지방교육세_비율;
  const 합계 = 본세 + 도시지역분 + 지방교육세;

  return {
    비율,
    과세표준: Math.floor(과세표준),
    산출과세표준: Math.floor(산출과세표준),
    상한적용,
    특례적용,
    세율,
    본세: Math.floor(본세),
    도시지역분: Math.floor(도시지역분),
    지방교육세: Math.floor(지방교육세),
    합계: Math.floor(합계),
    일괄부과: 본세 <= 분할부과_기준_세액,
  };
}

const 비교_공시가격 = [300_000_000, 500_000_000, 700_000_000, 900_000_000, 1_200_000_000];

export default function PropertyTaxCalculator() {
  const [공시가격, set공시가격] = useState(500_000_000);
  const [일주택, set일주택] = useState(true);
  const [도시지역, set도시지역] = useState(true);
  const [전년공시가격, set전년공시가격] = useState(0);
  const [calculated, setCalculated] = useState(false);

  const r = calcPropertyTax({ 공시가격, 일주택, 도시지역, 전년공시가격 });

  return (
    <div className="calc-container">
      <div className="calc-inputs">
        <InputField
          label="주택 공시가격"
          value={공시가격}
          onChange={set공시가격}
          suffix="원"
          isCurrency
          min={0}
          help="부동산공시가격 알리미에서 조회 (매매가가 아닙니다)"
        />

        <div className="calc-input-group">
          <label className="calc-label">보유 주택 수</label>
          <select
            className="calc-select"
            value={일주택 ? '1' : 'multi'}
            onChange={(e) => set일주택(e.target.value === '1')}
          >
            <option value="1">1세대 1주택</option>
            <option value="multi">다주택·법인 등</option>
          </select>
          <p className="calc-input-help">
            1주택은 공정시장가액비율이 43~45%로 낮아지고, 공시가격 9억원 이하면 세율도
            0.05%p 인하됩니다
          </p>
        </div>

        <div className="calc-input-group">
          <label className="calc-label">도시지역 여부</label>
          <select
            className="calc-select"
            value={도시지역 ? 'y' : 'n'}
            onChange={(e) => set도시지역(e.target.value === 'y')}
          >
            <option value="y">도시지역 (대부분의 아파트)</option>
            <option value="n">도시지역 아님</option>
          </select>
          <p className="calc-input-help">
            도시지역이면 재산세 도시지역분(과세표준의 0.14%)이 추가됩니다
          </p>
        </div>

        <InputField
          label="전년도 공시가격 (선택)"
          value={전년공시가격}
          onChange={set전년공시가격}
          suffix="원"
          isCurrency
          min={0}
          help="입력하면 과세표준상한제(연 5%)를 적용합니다. 모르면 비워두세요"
        />
      </div>

      <button className="calc-button" onClick={() => setCalculated(true)}>
        계산하기
      </button>

      {calculated && (
        <>
          <div className="calc-result-cards">
            <div className="calc-result-card calc-result-card--primary">
              <span className="calc-result-label">연간 재산세 합계</span>
              <span className="calc-result-value">{formatKRW(r.합계)}</span>
              <span className="calc-result-sub">
                재산세 + 도시지역분 + 지방교육세
              </span>
            </div>
            <div className="calc-result-card">
              <span className="calc-result-label">과세표준</span>
              <span className="calc-result-value">{formatManWon(r.과세표준)}</span>
              <span className="calc-result-sub">
                공시가격 × {(r.비율 * 100).toFixed(0)}%
                {r.상한적용 ? ' (상한 적용)' : ''}
              </span>
            </div>
            <div className="calc-result-card">
              <span className="calc-result-label">
                {r.일괄부과 ? '7월 일괄 납부' : '7월 / 9월 각각'}
              </span>
              <span className="calc-result-value">
                {formatKRW(r.일괄부과 ? r.합계 : Math.floor(r.합계 / 2))}
              </span>
              <span className="calc-result-sub">
                {r.일괄부과
                  ? '주택분 세액 20만원 이하는 7월에 전액'
                  : '주택분은 7월·9월 절반씩 부과'}
              </span>
            </div>
          </div>

          <div className="calc-compare">
            <h3>세액 구성 — 고지서에 찍히는 항목별</h3>
            <div className="calc-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>계산 기준</th>
                    <th>금액</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>재산세 (본세)</td>
                    <td>
                      과세표준 × {(r.세율 * 100).toFixed(2)}%
                      {r.특례적용 ? ' (1주택 특례세율)' : ''}
                    </td>
                    <td>{formatKRW(r.본세)}</td>
                  </tr>
                  <tr>
                    <td>재산세 도시지역분</td>
                    <td>{도시지역 ? '과세표준 × 0.14%' : '해당 없음'}</td>
                    <td>{formatKRW(r.도시지역분)}</td>
                  </tr>
                  <tr>
                    <td>지방교육세</td>
                    <td>재산세 본세 × 20%</td>
                    <td>{formatKRW(r.지방교육세)}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>합계</strong>
                    </td>
                    <td>—</td>
                    <td className="calc-compare-best">
                      <strong>{formatKRW(r.합계)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="calc-input-help">
              실제 고지서에는 지역자원시설세(소방분)가 함께 부과됩니다. 이 세금은
              공시가격이 아니라 지자체가 별도 산정한 건축물분 시가표준액을 기준으로 해
              공시가격만으로는 계산할 수 없어 위 합계에서 제외했습니다. 그만큼(보통 수천~수만원)
              고지서 금액이 더 많을 수 있습니다.
            </p>
          </div>

          <div className="calc-compare">
            <h3>공시가격별 재산세 — 1주택이면 얼마나 줄어드나</h3>
            <div className="calc-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>공시가격</th>
                    <th>1세대 1주택</th>
                    <th>다주택</th>
                    <th>차액</th>
                  </tr>
                </thead>
                <tbody>
                  {비교_공시가격.map((p) => {
                    const single = calcPropertyTax({
                      공시가격: p,
                      일주택: true,
                      도시지역,
                      전년공시가격: 0,
                    });
                    const multi = calcPropertyTax({
                      공시가격: p,
                      일주택: false,
                      도시지역,
                      전년공시가격: 0,
                    });
                    const isCurrent = 공시가격 >= p * 0.9 && 공시가격 <= p * 1.1;
                    return (
                      <tr key={p}>
                        <td>{formatManWon(p)}</td>
                        <td className={isCurrent ? 'calc-compare-best' : ''}>
                          {formatKRW(single.합계)}
                        </td>
                        <td>{formatKRW(multi.합계)}</td>
                        <td>−{formatKRW(multi.합계 - single.합계)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="calc-input-help">
              공시가격 9억원을 넘으면 1주택이어도 세율 특례가 빠져 차액이 줄어듭니다.
              공정시장가액비율 45%는 9억원 초과 1주택에도 그대로 적용됩니다.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

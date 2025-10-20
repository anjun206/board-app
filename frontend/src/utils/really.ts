// p = "한 번 더 물어볼 확률", max = 최대 횟수(상한)
export function sampleTotalSteps(p: number, max = 6) { // p: 0~1, max: 1 이상 권장
  let total = 1;                                       // 최소 1번은 묻는다
  while (total < max && Math.random() < p) total++;    // 매 단계마다 p 확률로 한 번 더
  return total;                                        // 1..max
}

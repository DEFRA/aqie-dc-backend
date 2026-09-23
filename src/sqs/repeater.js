export function splitRepeaterJson(input) {
  const baseMain = input?.main ?? {}
  const repeaterValue = input?.repeaters?.LbZxXf

  // The payload typically comes through as { LbZxXf: [{ ... }] }, but we also support
  // the single-item case where LbZxXf is a single object. Normalise both shapes so
  // downstream code can treat them consistently.
  if (repeaterValue == null) {
    return []
  }

  const repeaters = Array.isArray(repeaterValue)
    ? repeaterValue
    : [repeaterValue]

  if (repeaters.length === 0) {
    return []
  }

  return repeaters.map((repeaterItem) => ({
    ...baseMain,
    ...repeaterItem
  }))
}

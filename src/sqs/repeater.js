export function splitRepeaterJson(input) {
  const baseMain = input?.main ?? {}
  const repeaterValue = input?.repeaters?.LbZxXf

  // The payload typically comes through as { LbZxXf: [{ ... }] }, but we also support
  // the single-item case where LbZxXf is a single object. Normalise both shapes so
  // downstream code can treat them consistently.
  let repeaters = []

  if (Array.isArray(repeaterValue)) {
    repeaters = repeaterValue
  } else if (repeaterValue) {
    repeaters = [repeaterValue]
  } else {
    repeaters = []
  }

  if (repeaters.length === 0) {
    return {}
  }

  const outputs = repeaters.map((repeaterItem) => {
    return {
      ...baseMain, // copy all main fields
      ...repeaterItem // merge repeater fields into main
    }
  })

  return outputs
}

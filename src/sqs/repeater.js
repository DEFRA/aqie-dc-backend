export function splitRepeaterJson(input) {
  const baseMain = input.main
  const repeaters = input.repeaters?.LbZxXf || []

  if (!Array.isArray(repeaters) || repeaters.length === 0) {
    return {} // or return [input] depending on your needs
  }

  const outputs = repeaters.map((repeaterItem) => {
    return {
      ...baseMain, // copy all main fields
      ...repeaterItem // merge repeater fields into main
    }
  })

  return outputs
}

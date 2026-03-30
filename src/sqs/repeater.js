export function splitRepeaterJson(input) {
  const baseMain = input.data.main
  const repeaters = input.data.repeaters?.LbZxXf || []

  if (!Array.isArray(repeaters) || repeaters.length === 0) {
    return [] // or return [input] depending on your needs
  }

  const outputs = repeaters.map((repeaterItem) => {
    return {
      data: {
        main: {
          ...baseMain, // copy all main fields
          ...repeaterItem // merge repeater fields into main
        }
      }
    }
  })

  return outputs
}

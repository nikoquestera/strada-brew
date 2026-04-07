const test = require('node:test')
const assert = require('node:assert/strict')

const { DISC_SCORING_TABLE } = require('../src/lib/disc/data.ts')

test('graph II D normalization keeps value 17 negative', () => {
  const row = DISC_SCORING_TABLE.find((entry) => entry.line === 2 && entry.value === 17)

  assert.ok(row, 'expected line 2 / value 17 to exist')
  assert.equal(row.d, -6.7)
})

test('graph II D normalization decreases monotonically as raw value increases', () => {
  const rows = DISC_SCORING_TABLE
    .filter((entry) => entry.line === 2)
    .sort((a, b) => a.value - b.value)

  for (let index = 1; index < rows.length; index += 1) {
    assert.ok(
      rows[index].d <= rows[index - 1].d,
      `expected line 2 D score at value ${rows[index].value} (${rows[index].d}) to be <= value ${rows[index - 1].value} (${rows[index - 1].d})`,
    )
  }
})

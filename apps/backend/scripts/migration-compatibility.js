// Exact Git snapshots: 12b9fe3 (pre-removal) and 8d2325b (non-AI).
// Accept LF/CRLF checkouts only; never overwrite the historical ledger.
import { createHash } from 'node:crypto';

export function isLineEndingOnlyChecksum(source, recorded) {
  const digest = value => createHash('sha256').update(value).digest('hex');
  return recorded === digest(source.replace(/\r\n/g, '\n'))
    || recorded === digest(source.replace(/\r?\n/g, '\r\n'));
}

const snapshots = {
  "001_extensions.sql": {
    "historical": [
      "8d52cf81886f49846ee8afc2d33674468ec10a17ce1d0f6e58fc3c15b3871798",
      "e1a7b75f86d679faf88012bfd3445b2b45f094167b613d222d8c72228589b596"
    ],
    "current": [
      "b87eba2678441682bd4875e2f2ed3c82bcbf44b74f9eb7bd24f53791c8159f87",
      "e827e56c8ef021429bc59bdb1a8316f9093b7706d34f9a6f388684b50da5fd3d"
    ]
  },
  "policies.sql": {
    "historical": [
      "5aa20ef348d6e4cc069942aa11e5e5f3e068990e4a21c4f3550a6f4224bff9c4",
      "a6cb67c5e8ab948bbc1dbc25d212563cbfd7adc2f635c13367d7c99472283e8e"
    ],
    "current": [
      "4773a151635f6ffde75b1a9dffad9499e2cd70fed6dcdb6c7a1234a70b44d80f",
      "8d20e400a42510a7859c235d91b0593beb2577c98c7ae755d8e69466ba5812b7"
    ]
  }
};
export function isCompatibleHistoricalChecksum(name, recorded, current) {
  const entry = snapshots[name];
  return Boolean(entry && entry.current.includes(current)
    && [...entry.historical, ...entry.current].includes(recorded));
}

// Retired migration remains in the ledger and its data is never dropped.
export const retiredMigrations = {
  "012_embeddings.sql": [
    "45bda7356d0dc41bf26b5887b143c62b1ac154719b24912d24cbeb8f10047d09",
    "6f793b4722ff3292c71e38ca1d9ef694cbf1c31e8775b1dc15886aa04bd48a5a"
  ]
};

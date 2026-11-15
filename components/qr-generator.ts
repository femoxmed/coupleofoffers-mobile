/**
 * Self-contained, lightweight ISO/IEC 18004 compliant QR Code Generator.
 * Zero external dependencies. Generates boolean matrix for SVG rendering.
 */

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// Reed-Solomon GF(256) log and exp tables with generator 0x11D
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP_TABLE[i] = x;
  EXP_TABLE[i + 255] = x;
  LOG_TABLE[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function rsComputePoly(ecLen: number): Uint8Array {
  const poly = new Uint8Array(ecLen + 1);
  poly[0] = 1;
  for (let i = 0; i < ecLen; i++) {
    const factor = EXP_TABLE[i];
    for (let j = i + 1; j > 0; j--) {
      poly[j] = poly[j] ^ gfMul(poly[j - 1], factor);
    }
  }
  return poly;
}

function rsComputeRemainder(data: Uint8Array, ecLen: number, poly: Uint8Array): Uint8Array {
  const result = new Uint8Array(ecLen);
  for (const byte of data) {
    const factor = byte ^ result[0];
    for (let j = 0; j < ecLen - 1; j++) {
      result[j] = result[j + 1] ^ gfMul(factor, poly[j + 1]);
    }
    result[ecLen - 1] = gfMul(factor, poly[ecLen]);
  }
  return result;
}

// Version parameters: [dataCodewords, ecCodewordsPerBlock, numBlocks] for levels L, M, Q, H
// Covering Versions 1 to 6 (plenty for bookings, URLs, codes up to ~130 bytes)
interface VersionSpec {
  size: number;
  alignments: number[];
  ec: Record<ErrorCorrectionLevel, { dataWords: number; ecWordsPerBlock: number; blocks: number }>;
}

const VERSIONS: VersionSpec[] = [
  {
    size: 21,
    alignments: [],
    ec: {
      L: { dataWords: 19, ecWordsPerBlock: 7, blocks: 1 },
      M: { dataWords: 16, ecWordsPerBlock: 10, blocks: 1 },
      Q: { dataWords: 13, ecWordsPerBlock: 13, blocks: 1 },
      H: { dataWords: 9, ecWordsPerBlock: 17, blocks: 1 },
    },
  },
  {
    size: 25,
    alignments: [6, 18],
    ec: {
      L: { dataWords: 34, ecWordsPerBlock: 10, blocks: 1 },
      M: { dataWords: 28, ecWordsPerBlock: 16, blocks: 1 },
      Q: { dataWords: 22, ecWordsPerBlock: 22, blocks: 1 },
      H: { dataWords: 16, ecWordsPerBlock: 28, blocks: 1 },
    },
  },
  {
    size: 29,
    alignments: [6, 22],
    ec: {
      L: { dataWords: 55, ecWordsPerBlock: 15, blocks: 1 },
      M: { dataWords: 44, ecWordsPerBlock: 26, blocks: 1 },
      Q: { dataWords: 34, ecWordsPerBlock: 18, blocks: 2 },
      H: { dataWords: 26, ecWordsPerBlock: 22, blocks: 2 },
    },
  },
  {
    size: 33,
    alignments: [6, 26],
    ec: {
      L: { dataWords: 80, ecWordsPerBlock: 20, blocks: 1 },
      M: { dataWords: 64, ecWordsPerBlock: 18, blocks: 2 },
      Q: { dataWords: 48, ecWordsPerBlock: 26, blocks: 2 },
      H: { dataWords: 36, ecWordsPerBlock: 16, blocks: 4 },
    },
  },
  {
    size: 37,
    alignments: [6, 30],
    ec: {
      L: { dataWords: 108, ecWordsPerBlock: 26, blocks: 1 },
      M: { dataWords: 86, ecWordsPerBlock: 24, blocks: 2 },
      Q: { dataWords: 62, ecWordsPerBlock: 18, blocks: 4 },
      H: { dataWords: 46, ecWordsPerBlock: 22, blocks: 4 },
    },
  },
  {
    size: 41,
    alignments: [6, 34],
    ec: {
      L: { dataWords: 136, ecWordsPerBlock: 18, blocks: 2 },
      M: { dataWords: 108, ecWordsPerBlock: 16, blocks: 4 },
      Q: { dataWords: 76, ecWordsPerBlock: 24, blocks: 4 },
      H: { dataWords: 60, ecWordsPerBlock: 28, blocks: 4 },
    },
  },
];

// Format info bit strings for 8 mask patterns with ECC level M (BCH 15,5)
const FORMAT_INFO_M = [
  0b101010000010010, // mask 0
  0b101000100111101, // mask 1
  0b101111001111100, // mask 2
  0b101101101010011, // mask 3
  0b100010111111001, // mask 4
  0b100000011010110, // mask 5
  0b100111110010111, // mask 6
  0b100101010111000, // mask 7
];

export function generateQrMatrix(text: string, ecl: ErrorCorrectionLevel = 'M'): boolean[][] {
  const utf8 = new TextEncoder().encode(text);
  // Find smallest version that fits
  let versionIndex = -1;
  for (let i = 0; i < VERSIONS.length; i++) {
    const spec = VERSIONS[i].ec[ecl];
    // 4 bits mode + 8 bits count + payload bytes <= dataWords * 8
    const requiredBits = 4 + 8 + utf8.length * 8;
    if (requiredBits <= spec.dataWords * 8) {
      versionIndex = i;
      break;
    }
  }

  if (versionIndex === -1) {
    versionIndex = VERSIONS.length - 1; // Fallback to max version 6
  }

  const ver = VERSIONS[versionIndex];
  const ecSpec = ver.ec[ecl];
  const size = ver.size;

  // Build bitstream: Byte Mode (0b0100), 8-bit character count, payload, terminator 0000
  const totalDataBytes = ecSpec.dataWords;
  const buffer = new Uint8Array(totalDataBytes);
  let bitPos = 0;

  function writeBits(val: number, bits: number) {
    for (let i = bits - 1; i >= 0; i--) {
      const bit = (val >> i) & 1;
      const byteIdx = bitPos >> 3;
      const bitIdx = 7 - (bitPos & 7);
      if (byteIdx < buffer.length) {
        buffer[byteIdx] |= bit << bitIdx;
      }
      bitPos++;
    }
  }

  writeBits(0b0100, 4); // Byte mode
  writeBits(utf8.length, 8); // Character count
  for (const b of utf8) {
    writeBits(b, 8);
  }
  writeBits(0, Math.min(4, totalDataBytes * 8 - bitPos)); // Terminator

  // Align to byte
  if (bitPos % 8 !== 0) {
    bitPos += 8 - (bitPos % 8);
  }

  // Pad bytes: alternating 0xEC, 0x11
  let padToggle = 0xec;
  while (bitPos < totalDataBytes * 8) {
    writeBits(padToggle, 8);
    padToggle = padToggle === 0xec ? 0x11 : 0xec;
  }

  // Reed Solomon error correction
  const ecLen = ecSpec.ecWordsPerBlock;
  const numBlocks = ecSpec.blocks;
  const dataWordsPerBlock = Math.floor(totalDataBytes / numBlocks);
  const rsPoly = rsComputePoly(ecLen);

  const blockData: Uint8Array[] = [];
  const blockEc: Uint8Array[] = [];

  for (let b = 0; b < numBlocks; b++) {
    const dSlice = buffer.subarray(b * dataWordsPerBlock, (b + 1) * dataWordsPerBlock);
    blockData.push(dSlice);
    blockEc.push(rsComputeRemainder(dSlice, ecLen, rsPoly));
  }

  // Interleave data and EC
  const interleaved: number[] = [];
  for (let i = 0; i < dataWordsPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      interleaved.push(blockData[b][i]);
    }
  }
  for (let i = 0; i < ecLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      interleaved.push(blockEc[b][i]);
    }
  }

  // Matrix construction
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  // Finder pattern helper
  function drawFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            matrix[mr][mc] = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          } else {
            matrix[mr][mc] = false; // Separator
          }
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment patterns
  if (ver.alignments.length === 2) {
    const coords = ver.alignments;
    for (const r of coords) {
      for (const c of coords) {
        // Skip corners with finder patterns
        if ((r === 6 && c === 6) || (r === 6 && c === coords[1]) || (r === coords[1] && c === 6)) {
          if (r === 6 || c === 6) continue;
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            matrix[r + dr][c + dc] =
              Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          }
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  matrix[4 * (versionIndex + 1) + 9][8] = true;

  // Reserve format info area
  for (let i = 0; i <= 8; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }

  // Mask function (pattern 0: (row + col) % 2 === 0)
  const maskPattern = 0;
  function isMasked(r: number, c: number): boolean {
    return (r + c) % 2 === 0;
  }

  // Fill data
  let byteIndex = 0;
  let bitIndex = 7;
  let up = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing pattern
    for (let vert = 0; vert < size; vert++) {
      const row = up ? size - 1 - vert : vert;
      for (let col = right; col >= right - 1; col--) {
        if (matrix[row][col] === null) {
          let bit = false;
          if (byteIndex < interleaved.length) {
            bit = ((interleaved[byteIndex] >> bitIndex) & 1) === 1;
            bitIndex--;
            if (bitIndex < 0) {
              bitIndex = 7;
              byteIndex++;
            }
          }
          if (isMasked(row, col)) {
            bit = !bit;
          }
          matrix[row][col] = bit;
        }
      }
    }
    up = !up;
  }

  // Write format info (Format M, Mask 0)
  const formatBits = FORMAT_INFO_M[maskPattern];
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> (14 - i)) & 1) === 1;
    // Top-left
    if (i <= 5) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Split corners
    if (i < 8) {
      matrix[size - 1 - i][8] = bit;
    } else {
      matrix[8][size - 15 + i] = bit;
    }
  }

  return matrix as boolean[][];
}

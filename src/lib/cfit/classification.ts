export interface CfitClassification {
  rawScore: number
  scaledScore: number
  intelligenceClass: string
  category: string
}

const TABLE: CfitClassification[] = [
  { rawScore: 50, scaledScore: 183, intelligenceClass: 'GENIUS', category: 'BAIK SEKALI' },
  { rawScore: 49, scaledScore: 183, intelligenceClass: 'GENIUS', category: 'BAIK SEKALI' },
  { rawScore: 48, scaledScore: 179, intelligenceClass: 'GENIUS', category: 'BAIK SEKALI' },
  { rawScore: 47, scaledScore: 176, intelligenceClass: 'GENIUS', category: 'BAIK SEKALI' },
  { rawScore: 46, scaledScore: 173, intelligenceClass: 'GENIUS', category: 'BAIK SEKALI' },
  { rawScore: 45, scaledScore: 169, intelligenceClass: 'GENIUS', category: 'BAIK SEKALI' },
  { rawScore: 44, scaledScore: 167, intelligenceClass: 'VERY SUPERIOR', category: 'BAIK SEKALI' },
  { rawScore: 43, scaledScore: 165, intelligenceClass: 'VERY SUPERIOR', category: 'BAIK SEKALI' },
  { rawScore: 42, scaledScore: 161, intelligenceClass: 'VERY SUPERIOR', category: 'BAIK SEKALI' },
  { rawScore: 41, scaledScore: 157, intelligenceClass: 'VERY SUPERIOR', category: 'BAIK SEKALI' },
  { rawScore: 40, scaledScore: 155, intelligenceClass: 'VERY SUPERIOR', category: 'BAIK SEKALI' },
  { rawScore: 39, scaledScore: 152, intelligenceClass: 'VERY SUPERIOR', category: 'BAIK SEKALI' },
  { rawScore: 38, scaledScore: 149, intelligenceClass: 'VERY SUPERIOR', category: 'BAIK SEKALI' },
  { rawScore: 37, scaledScore: 145, intelligenceClass: 'VERY SUPERIOR', category: 'BAIK SEKALI' },
  { rawScore: 36, scaledScore: 142, intelligenceClass: 'VERY SUPERIOR', category: 'BAIK SEKALI' },
  { rawScore: 35, scaledScore: 140, intelligenceClass: 'SUPERIOR', category: 'BAIK' },
  { rawScore: 34, scaledScore: 137, intelligenceClass: 'SUPERIOR', category: 'BAIK' },
  { rawScore: 33, scaledScore: 133, intelligenceClass: 'SUPERIOR', category: 'BAIK' },
  { rawScore: 32, scaledScore: 131, intelligenceClass: 'SUPERIOR', category: 'BAIK' },
  { rawScore: 31, scaledScore: 128, intelligenceClass: 'SUPERIOR', category: 'BAIK' },
  { rawScore: 30, scaledScore: 124, intelligenceClass: 'SUPERIOR', category: 'BAIK' },
  { rawScore: 29, scaledScore: 121, intelligenceClass: 'SUPERIOR', category: 'BAIK' },
  { rawScore: 28, scaledScore: 119, intelligenceClass: 'HIGH AVERAGE', category: 'BAIK' },
  { rawScore: 27, scaledScore: 116, intelligenceClass: 'HIGH AVERAGE', category: 'BAIK' },
  { rawScore: 26, scaledScore: 113, intelligenceClass: 'HIGH AVERAGE', category: 'BAIK' },
  { rawScore: 25, scaledScore: 109, intelligenceClass: 'HIGH AVERAGE', category: 'BAIK' },
  { rawScore: 24, scaledScore: 106, intelligenceClass: 'AVERAGE', category: 'CUKUP' },
  { rawScore: 23, scaledScore: 103, intelligenceClass: 'AVERAGE', category: 'CUKUP' },
  { rawScore: 22, scaledScore: 100, intelligenceClass: 'AVERAGE', category: 'CUKUP' },
  { rawScore: 21, scaledScore: 96, intelligenceClass: 'AVERAGE', category: 'CUKUP' },
  { rawScore: 20, scaledScore: 94, intelligenceClass: 'AVERAGE', category: 'CUKUP' },
  { rawScore: 19, scaledScore: 91, intelligenceClass: 'AVERAGE', category: 'CUKUP' },
  { rawScore: 18, scaledScore: 88, intelligenceClass: 'LOW AVERAGE', category: 'KURANG' },
  { rawScore: 17, scaledScore: 85, intelligenceClass: 'LOW AVERAGE', category: 'KURANG' },
  { rawScore: 16, scaledScore: 81, intelligenceClass: 'LOW AVERAGE', category: 'KURANG' },
  { rawScore: 15, scaledScore: 78, intelligenceClass: 'BORDERLINE', category: 'KURANG' },
  { rawScore: 14, scaledScore: 75, intelligenceClass: 'BORDERLINE', category: 'KURANG' },
  { rawScore: 13, scaledScore: 72, intelligenceClass: 'BORDERLINE', category: 'KURANG' },
  { rawScore: 12, scaledScore: 70, intelligenceClass: 'BORDERLINE', category: 'KURANG' },
  { rawScore: 11, scaledScore: 67, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
  { rawScore: 10, scaledScore: 63, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
  { rawScore: 9, scaledScore: 60, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
  { rawScore: 8, scaledScore: 57, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
  { rawScore: 7, scaledScore: 55, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
  { rawScore: 6, scaledScore: 52, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
  { rawScore: 5, scaledScore: 48, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
  { rawScore: 4, scaledScore: 47, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
  { rawScore: 3, scaledScore: 45, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
  { rawScore: 2, scaledScore: 43, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
  { rawScore: 1, scaledScore: 40, intelligenceClass: 'MENTALLY DEFECTIVE', category: 'KURANG SEKALI' },
]

export function classifyCfitScore(rawScore: number): CfitClassification {
  return TABLE.find((item) => item.rawScore === rawScore) || TABLE[TABLE.length - 1]
}

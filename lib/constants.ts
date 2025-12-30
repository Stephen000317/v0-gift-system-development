// 品类选项
export const CATEGORY_OPTIONS = [
  "电子产品",
  "酒类",
  "礼品",
  "食品",
  "服装",
  "化妆品",
  "书籍",
  "玩具",
  "家居用品",
  "其他",
] as const

export type Category = (typeof CATEGORY_OPTIONS)[number]

export interface SmartRecommendation {
  id: string
  category: string
  suggestedItems: string[]
  reason: string
  valueRange: string
  matchScore: number
  tags: string[]
}

export function generateSmartRecommendations(
  receivedGift: {
    items: Array<{ category: string; name: string; quantity: number; unit_price: number }>
    sender_name: string
    sender_age?: number
    sender_gender?: string
    sender_company?: string
    occasion?: string
  },
  inventory: Array<{ category: string; name: string; quantity: number; unit_price: number }>,
): SmartRecommendation[] {
  const recommendations: SmartRecommendation[] = []

  // 计算收到礼物的总价值
  const totalValue = receivedGift.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  // 获取主要品类
  const mainCategory = receivedGift.items[0]?.category || "其他"
  const sender = {
    name: receivedGift.sender_name,
    age: receivedGift.sender_age,
    gender: receivedGift.sender_gender,
    company: receivedGift.sender_company,
  }

  // 推荐策略1: 价值对等原则
  const valueBasedRec = generateValueBasedRecommendation(totalValue, inventory, mainCategory)
  if (valueBasedRec) recommendations.push(valueBasedRec)

  // 推荐策略2: 品类互补原则
  const categoryBasedRec = generateCategoryBasedRecommendation(mainCategory, inventory, totalValue)
  if (categoryBasedRec) recommendations.push(categoryBasedRec)

  // 推荐策略3: 个性化推荐（基于送礼人信息）
  const personalizedRec = generatePersonalizedRecommendation(sender, inventory, totalValue)
  if (personalizedRec) recommendations.push(personalizedRec)

  // 推荐策略4: 季节性推荐
  const seasonalRec = generateSeasonalRecommendation(inventory, totalValue)
  if (seasonalRec) recommendations.push(seasonalRec)

  // 推荐策略5: 商务场合推荐（如果是公司客户）
  if (sender.company) {
    const businessRec = generateBusinessRecommendation(inventory, totalValue)
    if (businessRec) recommendations.push(businessRec)
  }

  // 按匹配度排序
  return recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5)
}

function generateValueBasedRecommendation(
  totalValue: number,
  inventory: Array<{ category: string; name: string; quantity: number; unit_price: number }>,
  receivedCategory: string,
): SmartRecommendation | null {
  // 回礼价值建议：略高于收到的礼物（1.1-1.3倍）
  const minValue = totalValue * 1.0
  const maxValue = totalValue * 1.3

  const suitableItems = inventory.filter(
    (item) => item.unit_price >= minValue && item.unit_price <= maxValue && item.quantity > 0,
  )

  if (suitableItems.length === 0) return null

  // 优先推荐不同品类的商品
  const differentCategory = suitableItems.filter((item) => item.category !== receivedCategory)
  const itemsToRecommend = differentCategory.length > 0 ? differentCategory : suitableItems

  return {
    id: "value-based",
    category: itemsToRecommend[0].category,
    suggestedItems: itemsToRecommend.slice(0, 3).map((item) => item.name),
    reason: `根据收到礼物价值¥${totalValue}，建议回礼价值在¥${minValue.toFixed(0)}-¥${maxValue.toFixed(0)}之间，体现礼尚往来的诚意。`,
    valueRange: `¥${minValue.toFixed(0)} - ¥${maxValue.toFixed(0)}`,
    matchScore: 95,
    tags: ["价值对等", "诚意满满"],
  }
}

function generateCategoryBasedRecommendation(
  receivedCategory: string,
  inventory: Array<{ category: string; name: string; quantity: number; unit_price: number }>,
  totalValue: number,
): SmartRecommendation | null {
  // 品类互补规则
  const categoryPairs: Record<string, string[]> = {
    酒类: ["茶叶", "食品", "保健品"],
    茶叶: ["酒类", "食品", "礼品"],
    电子产品: ["礼品", "书籍", "文具"],
    食品: ["酒类", "茶叶", "保健品"],
    化妆品: ["礼品", "服装", "饰品"],
    书籍: ["文具", "电子产品", "礼品"],
    礼品: ["酒类", "茶叶", "食品"],
  }

  const complementaryCategories = categoryPairs[receivedCategory] || ["礼品", "食品", "其他"]
  const suitableItems = inventory.filter((item) => complementaryCategories.includes(item.category) && item.quantity > 0)

  if (suitableItems.length === 0) return null

  return {
    id: "category-based",
    category: suitableItems[0].category,
    suggestedItems: suitableItems.slice(0, 3).map((item) => item.name),
    reason: `收到${receivedCategory}，建议回赠${complementaryCategories.join("、")}等品类，体现品味多样性和用心。`,
    valueRange: `参考价值¥${(totalValue * 1.1).toFixed(0)}左右`,
    matchScore: 88,
    tags: ["品类互补", "用心搭配"],
  }
}

function generatePersonalizedRecommendation(
  sender: { name: string; age?: number; gender?: string; company?: string },
  inventory: Array<{ category: string; name: string; quantity: number; unit_price: number }>,
  totalValue: number,
): SmartRecommendation | null {
  let preferredCategories: string[] = []
  let reason = ""

  // 基于年龄推荐
  if (sender.age) {
    if (sender.age < 30) {
      preferredCategories = ["电子产品", "化妆品", "书籍", "礼品"]
      reason = "年轻客户偏好时尚、实用的礼品，"
    } else if (sender.age < 50) {
      preferredCategories = ["酒类", "茶叶", "保健品", "礼品"]
      reason = "中年客户注重品质和健康，"
    } else {
      preferredCategories = ["保健品", "茶叶", "食品", "礼品"]
      reason = "年长客户更关注健康养生，"
    }
  }

  // 基于性别推荐
  if (sender.gender === "女") {
    preferredCategories = ["化妆品", "礼品", "食品", "饰品"]
    reason += "女性客户推荐精致优雅的礼品。"
  } else if (sender.gender === "男") {
    preferredCategories = ["酒类", "茶叶", "电子产品", "礼品"]
    reason += "男性客户推荐大气实用的礼品。"
  }

  const suitableItems = inventory.filter((item) => preferredCategories.includes(item.category) && item.quantity > 0)

  if (suitableItems.length === 0) return null

  return {
    id: "personalized",
    category: suitableItems[0].category,
    suggestedItems: suitableItems.slice(0, 3).map((item) => item.name),
    reason: reason || "根据送礼人特点，精心挑选合适的回礼。",
    valueRange: `参考价值¥${(totalValue * 1.15).toFixed(0)}左右`,
    matchScore: 92,
    tags: ["个性化", "贴心推荐"],
  }
}

function generateSeasonalRecommendation(
  inventory: Array<{ category: string; name: string; quantity: number; unit_price: number }>,
  totalValue: number,
): SmartRecommendation | null {
  const currentMonth = new Date().getMonth() + 1
  let seasonalCategories: string[] = []
  let reason = ""

  if (currentMonth >= 3 && currentMonth <= 5) {
    // 春季
    seasonalCategories = ["茶叶", "食品", "礼品"]
    reason = "春季适合赠送清新雅致的茶叶和食品，体现春意盎然。"
  } else if (currentMonth >= 6 && currentMonth <= 8) {
    // 夏季
    seasonalCategories = ["食品", "保健品", "礼品"]
    reason = "夏季适合赠送清凉消暑的食品和保健品，关怀倍至。"
  } else if (currentMonth >= 9 && currentMonth <= 11) {
    // 秋季
    seasonalCategories = ["酒类", "茶叶", "保健品"]
    reason = "秋季适合赠送滋补养生的酒类和保健品，温暖人心。"
  } else {
    // 冬季
    seasonalCategories = ["酒类", "保健品", "食品"]
    reason = "冬季适合赠送温暖滋补的礼品，传递温暖关怀。"
  }

  const suitableItems = inventory.filter((item) => seasonalCategories.includes(item.category) && item.quantity > 0)

  if (suitableItems.length === 0) return null

  return {
    id: "seasonal",
    category: suitableItems[0].category,
    suggestedItems: suitableItems.slice(0, 3).map((item) => item.name),
    reason,
    valueRange: `参考价值¥${(totalValue * 1.1).toFixed(0)}左右`,
    matchScore: 85,
    tags: ["应季推荐", "时令精选"],
  }
}

function generateBusinessRecommendation(
  inventory: Array<{ category: string; name: string; quantity: number; unit_price: number }>,
  totalValue: number,
): SmartRecommendation | null {
  // 商务场合优选品类
  const businessCategories = ["酒类", "茶叶", "礼品", "电子产品"]

  const suitableItems = inventory.filter(
    (item) => businessCategories.includes(item.category) && item.quantity > 0 && item.unit_price >= totalValue * 1.1,
  )

  if (suitableItems.length === 0) return null

  return {
    id: "business",
    category: suitableItems[0].category,
    suggestedItems: suitableItems.slice(0, 3).map((item) => item.name),
    reason: "商务往来建议选择大气得体的礼品，彰显专业形象和重视程度。",
    valueRange: `参考价值¥${(totalValue * 1.2).toFixed(0)}以上`,
    matchScore: 90,
    tags: ["商务首选", "专业体面"],
  }
}

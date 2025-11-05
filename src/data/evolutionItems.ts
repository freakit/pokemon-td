// src/data/evolutionItems.ts

export interface EvolutionItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'stone' | 'special' | 'friendship' | 'trade' | 'others';
}

export const EVOLUTION_ITEMS: Record<string, EvolutionItem> = {
  // 진화의 돌 (기본)
  'fire-stone': { 
    id: 'fire-stone', 
    name: '불꽃의 돌', 
    description: '불꽃 타입 포켓몬을 진화시키는 붉은 돌',
    price: 500,
    category: 'stone'
  },
  'water-stone': { 
    id: 'water-stone', 
    name: '물의 돌', 
    description: '물 타입 포켓몬을 진화시키는 푸른 돌',
    price: 500,
    category: 'stone'
  },
  'thunder-stone': { 
    id: 'thunder-stone', 
    name: '천둥의 돌', 
    description: '전기 타입 포켓몬을 진화시키는 노란 돌',
    price: 500,
    category: 'stone'
  },
  'leaf-stone': { 
    id: 'leaf-stone', 
    name: '리프의 돌', 
    description: '풀 타입 포켓몬을 진화시키는 초록 돌',
    price: 500,
    category: 'stone'
  },
  'moon-stone': { 
    id: 'moon-stone', 
    name: '달의 돌', 
    description: '특정 포켓몬을 진화시키는 검은 돌',
    price: 500,
    category: 'stone'
  },
  'sun-stone': { 
    id: 'sun-stone', 
    name: '태양의 돌', 
    description: '특정 포켓몬을 진화시키는 밝은 돌',
    price: 500,
    category: 'stone'
  },
  'shiny-stone': { 
    id: 'shiny-stone', 
    name: '빛의 돌', 
    description: '특정 포켓몬을 진화시키는 빛나는 돌',
    price: 500,
    category: 'stone'
  },
  'dusk-stone': { 
    id: 'dusk-stone', 
    name: '어둠의 돌', 
    description: '특정 포켓몬을 진화시키는 어두운 돌',
    price: 500,
    category: 'stone'
  },
  'dawn-stone': { 
    id: 'dawn-stone', 
    name: '각성의 돌', 
    description: '특정 포켓몬을 진화시키는 새벽의 돌',
    price: 500,
    category: 'stone'
  },
  'ice-stone': { 
    id: 'ice-stone', 
    name: '얼음의 돌', 
    description: '얼음 타입 포켓몬을 진화시키는 차가운 돌',
    price: 500,
    category: 'stone'
  },
  
  // 통신/교환 진화 아이템
  'linking-cord': { 
    id: 'linking-cord', 
    name: '연결의 끈', 
    description: '통신교환으로 진화하는 포켓몬을 진화시킴',
    price: 500,
    category: 'trade'
  },
  'kings-rock': { 
    id: 'kings-rock', 
    name: '왕의징표석', 
    description: '야돈이나 수륙챙이를 진화시키는 왕관 모양 돌',
    price: 500,
    category: 'special'
  },
  'metal-coat': { 
    id: 'metal-coat', 
    name: '금속코트', 
    description: '롱스톤이나 스라크를 진화시키는 금속 장비',
    price: 500,
    category: 'special'
  },
  'dragon-scale': { 
    id: 'dragon-scale', 
    name: '용의비늘', 
    description: '시드라를 킹드라로 진화시키는 용의 비늘',
    price: 500,
    category: 'special'
  },
  'upgrade': { 
    id: 'upgrade', 
    name: '업그레이드', 
    description: '폴리곤을 폴리곤2로 진화시키는 장치',
    price: 500,
    category: 'special'
  },
  'protector': { 
    id: 'protector', 
    name: '프로텍터', 
    description: '코뿌리를 거대코뿌리로 진화시키는 보호구',
    price: 500,
    category: 'special'
  },
  'electirizer': { 
    id: 'electirizer', 
    name: '에레키부스터', 
    description: '에레브를 에레키블로 진화시키는 전기 장치',
    price: 500,
    category: 'special'
  },
  'magmarizer': { 
    id: 'magmarizer', 
    name: '마그마부스터', 
    description: '마그마를 마그마번으로 진화시키는 마그마 장치',
    price: 500,
    category: 'special'
  },
  'dubious-disc': { 
    id: 'dubious-disc', 
    name: '괴상한패치', 
    description: '폴리곤2를 폴리곤Z로 진화시키는 디스크',
    price: 500,
    category: 'special'
  },
  'reaper-cloth': { 
    id: 'reaper-cloth', 
    name: '영계의천', 
    description: '미라몽을 야느와르몽으로 진화시키는 천',
    price: 500,
    category: 'special'
  },
  'razor-claw': { 
    id: 'razor-claw', 
    name: '예리한손톱', 
    description: '포푸니를 포푸니라로 진화시키는 날카로운 손톱',
    price: 500,
    category: 'special'
  },
  'razor-fang': { 
    id: 'razor-fang', 
    name: '예리한이빨', 
    description: '글라이거를 글라이온으로 진화시키는 날카로운 이빨',
    price: 500,
    category: 'special'
  },
  
  // 기타 특수 진화 아이템
  'friendship-evolution': { 
    id: 'friendship-evolution', 
    name: '우정의 구슬', 
    description: '친밀도로 진화하는 포켓몬을 진화시키는 구슬',
    price: 500,
    category: 'friendship'
  },
  'special-evolution': { 
    id: 'special-evolution', 
    name: '신비한 가루', 
    description: '특수 조건으로 진화하는 포켓몬을 진화시키는 가루',
    price: 500,
    category: 'others'
  },
  
  // 기타 아이템들 (필요 시 추가)
  'deep-sea-tooth': {
    id: 'deep-sea-tooth',
    name: '심해의이빨',
    description: '진주몽을 헌테일로 진화시키는 이빨',
    price: 500,
    category: 'special'
  },
  'deep-sea-scale': {
    id: 'deep-sea-scale',
    name: '심해의비늘',
    description: '진주몽을 분홍장이로 진화시키는 비늘',
    price: 500,
    category: 'special'
  },
  'sachet': {
    id: 'sachet',
    name: '향기주머니',
    description: '슈쁘를 프레프티르로 진화시키는 향기주머니',
    price: 500,
    category: 'special'
  },
  'whipped-dream': {
    id: 'whipped-dream',
    name: '휘핑팝',
    description: '나룸퍼프를 나루림으로 진화시키는 휘핑크림',
    price: 500,
    category: 'special'
  },
  'tart-apple': {
    id: 'tart-apple',
    name: '새콤한사과',
    description: '과사삭벌레를 애프룡으로 진화시키는 사과',
    price: 500,
    category: 'special'
  },
  'sweet-apple': {
    id: 'sweet-apple',
    name: '달콤한사과',
    description: '과사삭벌레를 단지래플으로 진화시키는 사과',
    price: 500,
    category: 'special'
  },
  'galarica-cuff': {
    id: 'galarica-cuff',
    name: '가라르팔찌',
    description: '가라르 야돈을 야도란으로 진화시키는 팔찌',
    price: 500,
    category: 'special'
  },
  'galarica-wreath': {
    id: 'galarica-wreath',
    name: '가라르목걸이',
    description: '가라르 야돈을 야도킹으로 진화시키는 목걸이',
    price: 500,
    category: 'special'
  },
  'black-augurite': {
    id: 'black-augurite',
    name: '검은휘석',
    description: '스라크를 사마자르로 진화시키는 검은 광석',
    price: 500,
    category: 'special'
  },
  'auspicious-armor': {
    id: 'auspicious-armor',
    name: '길조의 갑옷',
    description: '카르본을 카디나르마로 진화시키는 갑옷',
    price: 500,
    category: 'special'
  },
  'malicious-armor': {
    id: 'malicious-armor',
    name: '흉조의 갑옷',
    description: '카르본을 파라블레이즈로 진화시키는 갑옷',
    price: 500,
    category: 'special'
  },
  'syrupy-apple': {
    id: 'syrupy-apple',
    name: '과즙한 사과',
    description: '과사삭벌레를 과미드라로 진화시키는 사과',
    price: 500,
    category: 'special'
  },
  'metal-alloy': {
    id: 'metal-alloy',
    name: '금속합금',
    description: '두랄루돈을 브리두라스로 진화시키는 합금',
    price: 500,
    category: 'special'
  },
  'water-scroll': {
    id: 'water-scroll',
    name: '물의 족자',
    description: '치고마를 우라오스(연격의 태세)로 진화시키는 족자',
    price: 500,
    category: 'special'
  },
  'dark-scroll': {
    id: 'dark-scroll',
    name: '악의 족자',
    description: '치고마를 우라오스(일격의 태세)로 진화시키는 족자',
    price: 500,
    category: 'special'
  },
};

// 카테고리별 아이템 목록
export const EVOLUTION_ITEMS_BY_CATEGORY = {
  stone: Object.values(EVOLUTION_ITEMS).filter(item => item.category === 'stone'),
  special: Object.values(EVOLUTION_ITEMS).filter(item => item.category === 'special'),
  friendship: Object.values(EVOLUTION_ITEMS).filter(item => item.category === 'friendship'),
  trade: Object.values(EVOLUTION_ITEMS).filter(item => item.category === 'trade'),
  others: Object.values(EVOLUTION_ITEMS).filter(item => item.category === 'others'),
};
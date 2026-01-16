// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Laon Blog';
export const SITE_DESCRIPTION = 'Sharing insights on Health, Tech, and Finance';

// 다국어 텍스트
export const UI_TEXT = {
  ko: {
    welcome: 'Welcome',
    hero_subtitle: 'Health, Tech, Finance 인사이트를 공유합니다',
    explore_topics: '주제별 탐색',
    latest_posts: '최신 글',
    view_all_posts: '전체 글 보기',
    posts_count: '개',
    all_posts: '전체 글',      
    previous: '이전',          
    next: '다음',              
    page: '페이지', 
  },
  en: {
    welcome: 'Welcome',
    hero_subtitle: 'Sharing insights on Health, Tech, and Finance',
    explore_topics: 'Explore Topics',
    latest_posts: 'Latest Posts',
    view_all_posts: 'View All Posts',
    posts_count: ' posts',
    all_posts: 'All Posts',    
    previous: 'Previous',     
    next: 'Next',              
    page: 'Page',
  }
} as const;

// 카테고리 정보
export const CATEGORY_INFO = {
  health: {
    name: {
      ko: '건강 & 피트니스',
      en: 'Health & Fitness'
    },
    description: {
      ko: '운동, 영양, 보충제',
      en: 'Workout, Nutrition, Supplements'
    },
    color: 'health'
  },
  tech: {
    name: {
      ko: '기술 & 개발',
      en: 'Tech & Dev'
    },
    description: {
      ko: '개발, 도구, 프로덕트',
      en: 'Development, Tools, Products'
    },
    color: 'tech'
  },
  finance: {
    name: {
      ko: '재테크 & 수익화',
      en: 'Finance & Money'
    },
    description: {
      ko: '수익화, 투자, 비즈니스',
      en: 'Monetization, Investment, Business'
    },
    color: 'finance'
  },
  other: {
    name: {
      ko: '기타',
      en: 'Other'
    },
    description: {
      ko: '기타 주제들',
      en: 'Other Topics'
    },
    color: 'other'
  }
} as const;

export type CategoryKey = keyof typeof CATEGORY_INFO;
export type Language = 'ko' | 'en';
export const DEFAULT_LANG: Language = 'ko';
export const DEMO_TENANTS = {
  HARBOR_WHOLESALE: 'harbor-wholesale',
  PEARL_BAKERY: 'pearl-bakery',
  DRAGON_ELECTRONICS: 'dragon-electronics',
  JADE_TEXTILES: 'jade-textiles',
} as const;

export const DEMO_EMAILS = {
  HARBOR_OWNER: 'owner@harbor.demo',
  HARBOR_EMPLOYEE: 'employee@harbor.demo',
  HARBOR_REVIEWER: 'reviewer@harbor.demo',
  PEARL_OWNER: 'owner@pearl.demo',
  /** Owner of both Dragon Electronics and Jade Textiles */
  ROHAN_OWNER: 'rohan@work.com',
  /** Dragon Electronics employees */
  DRAGON_EMPLOYEE_1: 'alice.chen@dragon.demo',
  DRAGON_EMPLOYEE_2: 'bob.li@dragon.demo',
  DRAGON_EMPLOYEE_3: 'carol.wu@dragon.demo',
  DRAGON_REVIEWER: 'david.zhao@dragon.demo',
  /** Jade Textiles employees */
  JADE_EMPLOYEE_1: 'emma.huang@jade.demo',
  JADE_EMPLOYEE_2: 'frank.liu@jade.demo',
  JADE_EMPLOYEE_3: 'grace.wang@jade.demo',
  JADE_REVIEWER: 'henry.zhang@jade.demo',
} as const;

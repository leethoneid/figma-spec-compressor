import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processAndBenchmark } from '../src/serializer.js';
import { extractFigmaNode } from '../src/figma-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function generateEnterpriseDashboardFixture(): any {
  let idCounter = 1000;
  const nextId = (prefix: string) => `${prefix}_${++idCounter}`;

  // Standard Tailwind palette colors (normalized 0-1)
  const cWhite = { r: 1, g: 1, b: 1, a: 1 };
  const cSlate50 = { r: 248 / 255, g: 250 / 255, b: 252 / 255, a: 1 };
  const cSlate100 = { r: 241 / 255, g: 245 / 255, b: 249 / 255, a: 1 };
  const cSlate200 = { r: 226 / 255, g: 232 / 255, b: 240 / 255, a: 1 };
  const cSlate400 = { r: 148 / 255, g: 163 / 255, b: 184 / 255, a: 1 };
  const cSlate500 = { r: 100 / 255, g: 116 / 255, b: 139 / 255, a: 1 };
  const cSlate700 = { r: 51 / 255, g: 65 / 255, b: 85 / 255, a: 1 };
  const cSlate900 = { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 1 };
  const cBlue600 = { r: 37 / 255, g: 99 / 255, b: 235 / 255, a: 1 };
  const cEmerald500 = { r: 16 / 255, g: 185 / 255, b: 129 / 255, a: 1 };
  const cRed500 = { r: 239 / 255, g: 68 / 255, b: 68 / 255, a: 1 };

  // Rich multi-coordinate SVG vector path resembling realistic complex icon geometry
  const defaultFillPath =
    'M 12.456 2.123 C 6.543 2.123, 2.123 6.543, 2.123 12.456 C 2.123 18.369, 6.543 22.789, 12.456 22.789 C 18.369 22.789, 22.789 18.369, 22.789 12.456 C 22.789 6.543, 18.369 2.123, 12.456 2.123 Z M 11.234 7.890 L 13.456 7.890 L 13.456 14.567 L 11.234 14.567 Z M 11.234 16.789 L 13.456 16.789 L 13.456 19.012 L 11.234 19.012 Z M 5.2 8.4 C 4.1 9.2 3.8 11.1 4.5 12.6 C 5.2 14.1 7.1 14.8 8.6 14.1 C 10.1 13.4 10.8 11.5 10.1 10.0 C 9.4 8.5 7.5 7.8 6.0 8.5 Z';

  const createVectorNode = (name: string, customPath?: string) => ({
    id: nextId('vec'),
    name,
    type: 'VECTOR',
    blendMode: 'PASS_THROUGH',
    absoluteBoundingBox: { x: 100.5, y: 200.75, width: 24, height: 24 },
    absoluteRenderBounds: { x: 100.25, y: 200.5, width: 24.5, height: 24.5 },
    constraints: { horizontal: 'SCALE', vertical: 'SCALE' },
    relativeTransform: [
      [1, 0, 100.5],
      [0, 1, 200.75]
    ],
    size: { x: 24, y: 24 },
    fills: [
      {
        type: 'SOLID',
        visible: true,
        opacity: 1,
        blendMode: 'NORMAL',
        color: cBlue600
      }
    ],
    strokes: [
      {
        type: 'SOLID',
        visible: true,
        opacity: 0.8,
        blendMode: 'NORMAL',
        color: cSlate900
      }
    ],
    strokeWeight: 1.5,
    strokeAlign: 'INSIDE',
    strokeGeometry: [{ path: 'M 0 0 L 24 0 L 24 24 L 0 24 Z', windingRule: 'NONZERO' }],
    fillGeometry: [{ path: customPath || defaultFillPath, windingRule: 'NONZERO' }]
  });

  const createMultiPathIcon = (name: string, pathCount = 3) => {
    const children = [];
    for (let p = 0; p < pathCount; p++) {
      children.push(createVectorNode(`${name} Path ${p + 1}`));
    }
    const iconName = name.endsWith('Icon') ? name : `${name} Icon`;
    return {
      id: nextId('icon'),
      name: iconName,
      type: 'FRAME',
      layoutMode: 'NONE',
      absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
      children
    };
  };

  const createTextNode = (name: string, characters: string, size = 14, weight = 400, color = cSlate900) => ({
    id: nextId('txt'),
    name,
    type: 'TEXT',
    characters,
    style: {
      fontFamily: 'Inter',
      fontSize: size,
      fontWeight: weight,
      lineHeightPx: size * 1.4,
      letterSpacing: -0.2
    },
    fills: [{ type: 'SOLID', visible: true, opacity: 1, color }]
  });

  // 1. Sidebar with brand logo + 12 navigation items (each with multi-path VECTOR icon + relativeTransform + constraints + strokes + label TEXT)
  const navTitles = [
    'Overview',
    'Analytics',
    'Customers',
    'Subscriptions',
    'Pipelines',
    'Invoices',
    'Integrations',
    'Audit Logs',
    'Security',
    'Team',
    'API Keys',
    'Settings'
  ];

  const sidebarNavItems = navTitles.map((title, index) => ({
    id: nextId('nav_item'),
    name: `Nav ${title}`,
    type: 'FRAME',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    itemSpacing: 12,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    cornerRadius: 6,
    fills: index === 1 ? [{ type: 'SOLID', color: cSlate700 }] : [],
    children: [
      createMultiPathIcon(title, 3),
      createTextNode('Label', title, 14, index === 1 ? 600 : 500, cSlate100)
    ]
  }));

  const sidebar = {
    id: 'sidebar_root',
    name: 'Sidebar',
    type: 'FRAME',
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    itemSpacing: 8,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 24,
    paddingBottom: 24,
    fills: [{ type: 'SOLID', color: cSlate900 }],
    children: [
      {
        id: nextId('brand'),
        name: 'Brand',
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        itemSpacing: 12,
        counterAxisAlignItems: 'CENTER',
        children: [
          createMultiPathIcon('AcmeLogo', 4),
          createTextNode('Title', 'Acme Cloud Platform', 18, 700, cWhite)
        ]
      },
      ...sidebarNavItems
    ]
  };

  // 2. Top Header Bar (search bar, filter pills, notification badge, avatar)
  const headerBar = {
    id: nextId('header_bar'),
    name: 'Header Bar',
    type: 'FRAME',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'SPACE_BETWEEN',
    counterAxisAlignItems: 'CENTER',
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 16,
    paddingBottom: 16,
    fills: [{ type: 'SOLID', color: cWhite }],
    strokes: [{ type: 'SOLID', color: cSlate200 }],
    strokeWeight: 1,
    children: [
      {
        id: nextId('search_bar'),
        name: 'Search Bar',
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 8,
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 8,
        paddingBottom: 8,
        cornerRadius: 6,
        strokes: [{ type: 'SOLID', color: cSlate200 }],
        children: [
          createMultiPathIcon('Search', 2),
          createTextNode('Search Input', 'Search customers, subscriptions...', 14, 400, cSlate400),
          createTextNode('Shortcut', '⌘K', 12, 600, cSlate500)
        ]
      },
      {
        id: nextId('filters'),
        name: 'Filter Pills',
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        itemSpacing: 8,
        children: ['Last 30 Days', 'All Regions', 'USD ($)'].map(pill => ({
          id: nextId('pill'),
          name: `Pill ${pill}`,
          type: 'FRAME',
          layoutMode: 'HORIZONTAL',
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 6,
          paddingBottom: 6,
          cornerRadius: 999,
          fills: [{ type: 'SOLID', color: cSlate100 }],
          children: [createMultiPathIcon(pill, 2), createTextNode('Text', pill, 12, 500, cSlate700)]
        }))
      },
      {
        id: nextId('header_user'),
        name: 'User Section',
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        itemSpacing: 12,
        counterAxisAlignItems: 'CENTER',
        children: [
          createMultiPathIcon('NotificationBell', 3),
          createTextNode('Count', '4', 12, 700, cRed500),
          createMultiPathIcon('AvatarCircle', 3),
          createTextNode('User', 'Sarah J. (Admin)', 14, 600, cSlate900)
        ]
      }
    ]
  };

  // 3. 4 KPI Metric Cards with sparkline vector clusters & delta badges
  const kpiData = [
    { title: 'Total ARR', value: '$4,820,000', delta: '+24.8%', color: cEmerald500 },
    { title: 'Net Revenue Retention', value: '118.4%', delta: '+3.2%', color: cEmerald500 },
    { title: 'Active Subscriptions', value: '1,428', delta: '+18.5%', color: cEmerald500 },
    { title: 'CAC Payback Period', value: '8.4 mo', delta: '-12.1%', color: cBlue600 }
  ];

  const sparklinePaths = [
    'M 0 45 C 5 42, 10 40, 15 38 C 20 35, 25 39, 30 32 C 35 28, 40 30, 45 25 C 50 22, 55 24, 60 18 C 65 15, 70 20, 75 14 C 80 12, 85 10, 90 8 C 95 6, 100 8, 105 5 L 105 50 L 0 50 Z',
    'M 0 35 C 8 32, 16 38, 24 28 C 32 20, 40 25, 48 18 C 56 12, 64 22, 72 15 C 80 10, 88 14, 96 8 L 105 5',
    'M 0 50 L 10 45 L 20 40 L 30 35 L 40 38 L 50 30 L 60 25 L 70 20 L 80 15 L 90 12 L 100 8 L 105 5',
    'M 5 50 C 15 45, 25 35, 35 30 C 45 25, 55 20, 65 15 C 75 10, 85 8, 95 6 L 105 5'
  ];

  const kpiCards = kpiData.map(kpi => ({
    id: nextId('kpi_card'),
    name: `Card ${kpi.title}`,
    type: 'FRAME',
    layoutMode: 'VERTICAL',
    itemSpacing: 12,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 20,
    cornerRadius: 12,
    fills: [{ type: 'SOLID', color: cWhite }],
    strokes: [{ type: 'SOLID', color: cSlate200 }],
    strokeWeight: 1,
    effects: [{ type: 'DROP_SHADOW', visible: true, radius: 8, color: { r: 0, g: 0, b: 0, a: 0.06 }, offset: { x: 0, y: 4 } }],
    children: [
      {
        id: nextId('kpi_header'),
        name: 'Header',
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        primaryAxisAlignItems: 'SPACE_BETWEEN',
        counterAxisAlignItems: 'CENTER',
        children: [
          createTextNode('Title', kpi.title, 14, 500, cSlate500),
          createMultiPathIcon('InfoIcon', 2)
        ]
      },
      createTextNode('Value', kpi.value, 30, 700, cSlate900),
      {
        id: nextId('delta_badge'),
        name: 'Delta Badge',
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        itemSpacing: 4,
        counterAxisAlignItems: 'CENTER',
        children: [
          createMultiPathIcon('DeltaArrow', 2),
          createTextNode('Delta', kpi.delta, 12, 600, kpi.color)
        ]
      },
      {
        id: nextId('sparkline_cluster'),
        name: 'Sparkline Icon',
        type: 'FRAME',
        layoutMode: 'NONE',
        absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 50 },
        children: sparklinePaths.map((sp, idx) => createVectorNode(`Sparkline Segment ${idx + 1}`, sp))
      }
    ]
  }));

  const kpiSection = {
    id: nextId('kpi_section'),
    name: 'KPI Row',
    type: 'FRAME',
    layoutMode: 'HORIZONTAL',
    itemSpacing: 16,
    children: kpiCards
  };

  // 4. 20-row customer subscription data table (6 columns per row)
  const customers = [
    { name: 'Acme Global Corp', email: 'billing@acmeglobal.com', plan: 'Enterprise Plus', mrr: '$24,500', date: '2026-10-28' },
    { name: 'Stripe Payments Inc', email: 'finance@stripe.com', plan: 'Scale Dedicated', mrr: '$45,000', date: '2026-10-27' },
    { name: 'Linear App LLC', email: 'ops@linear.app', plan: 'Enterprise', mrr: '$12,800', date: '2026-10-27' },
    { name: 'Vercel Platforms', email: 'accounts@vercel.com', plan: 'Scale Dedicated', mrr: '$38,200', date: '2026-10-26' },
    { name: 'Supabase Systems', email: 'eng@supabase.io', plan: 'Enterprise Plus', mrr: '$19,500', date: '2026-10-25' },
    { name: 'Retool Software', email: 'admin@retool.com', plan: 'Enterprise', mrr: '$16,000', date: '2026-10-24' },
    { name: 'Notion Labs Inc', email: 'sub@notion.so', plan: 'Scale Dedicated', mrr: '$52,000', date: '2026-10-24' },
    { name: 'Figma Design Corp', email: 'procurement@figma.com', plan: 'Enterprise Plus', mrr: '$28,400', date: '2026-10-23' },
    { name: 'Datadog Monitors', email: 'finance@datadoghq.com', plan: 'Scale Dedicated', mrr: '$64,000', date: '2026-10-22' },
    { name: 'Snowflake Analytics', email: 'cloud@snowflake.com', plan: 'Scale Dedicated', mrr: '$78,500', date: '2026-10-22' },
    { name: 'GitLab Security', email: 'security@gitlab.com', plan: 'Enterprise', mrr: '$15,200', date: '2026-10-21' },
    { name: 'HashiCorp Vaults', email: 'license@hashicorp.com', plan: 'Enterprise Plus', mrr: '$22,000', date: '2026-10-20' },
    { name: 'Postman Networks', email: 'billing@postman.com', plan: 'Enterprise', mrr: '$14,800', date: '2026-10-19' },
    { name: 'Docker Container Corp', email: 'accounting@docker.com', plan: 'Enterprise', mrr: '$17,500', date: '2026-10-18' },
    { name: 'Cloudflare Edge', email: 'edge@cloudflare.com', plan: 'Scale Dedicated', mrr: '$49,000', date: '2026-10-17' },
    { name: 'Grafana Labs', email: 'metrics@grafana.com', plan: 'Enterprise Plus', mrr: '$21,300', date: '2026-10-16' },
    { name: 'PagerDuty OnCall', email: 'alerts@pagerduty.com', plan: 'Enterprise', mrr: '$13,900', date: '2026-10-15' },
    { name: 'Snyk DevSecOps', email: 'scans@snyk.io', plan: 'Enterprise Plus', mrr: '$26,100', date: '2026-10-14' },
    { name: 'LaunchDarkly Flags', email: 'toggles@launchdarkly.com', plan: 'Enterprise', mrr: '$18,400', date: '2026-10-13' },
    { name: 'Segment CDP', email: 'streams@segment.com', plan: 'Scale Dedicated', mrr: '$41,000', date: '2026-10-12' }
  ];

  const tableHeaderRow = {
    id: nextId('table_header'),
    name: 'Table Header',
    type: 'FRAME',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'SPACE_BETWEEN',
    counterAxisAlignItems: 'CENTER',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fills: [{ type: 'SOLID', color: cSlate50 }],
    strokes: [{ type: 'SOLID', color: cSlate200 }],
    strokeWeight: 1,
    children: [
      createMultiPathIcon('HeaderCheckbox', 2),
      createTextNode('Col Customer', 'Customer & Email', 12, 600, cSlate500),
      createTextNode('Col Plan', 'Plan Tier', 12, 600, cSlate500),
      createTextNode('Col MRR', 'MRR Value', 12, 600, cSlate500),
      createTextNode('Col Date', 'Billing Date', 12, 600, cSlate500),
      createTextNode('Col Actions', 'Actions', 12, 600, cSlate500)
    ]
  };

  const tableRows = customers.map((c, i) => ({
    id: nextId(`row_${i}`),
    name: `Row ${i + 1}`,
    type: 'FRAME',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'SPACE_BETWEEN',
    counterAxisAlignItems: 'CENTER',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fills: i % 2 === 0 ? [{ type: 'SOLID', color: cWhite }] : [{ type: 'SOLID', color: cSlate50 }],
    strokes: [{ type: 'SOLID', color: cSlate200 }],
    strokeWeight: 1,
    children: [
      // Col 1: Checkbox Vector
      createMultiPathIcon(`CheckboxIcon`, 2),
      // Col 2: Customer Name & Email
      {
        id: nextId('cust_cell'),
        name: 'Customer Info',
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 8,
        children: [
          createMultiPathIcon(`AvatarIcon`, 2),
          createTextNode('Name & Email', `${c.name} (${c.email})`, 13, 500, cSlate900)
        ]
      },
      // Col 3: Plan Badge
      {
        id: nextId('plan_badge'),
        name: `Badge`,
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        counterAxisAlignItems: 'CENTER',
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 4,
        paddingBottom: 4,
        cornerRadius: 999,
        fills: [{ type: 'SOLID', color: cSlate100 }],
        children: [createTextNode('Plan', c.plan, 12, 600, cBlue600)]
      },
      // Col 4: MRR Amount
      createTextNode('MRR', c.mrr, 14, 600, cSlate900),
      // Col 5: Date
      createTextNode('Date', c.date, 13, 400, cSlate500),
      // Col 6: Action Button
      {
        id: nextId('action_btn'),
        name: `Manage Button`,
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 4,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 4,
        paddingBottom: 4,
        cornerRadius: 6,
        strokes: [{ type: 'SOLID', color: cSlate200 }],
        strokeWeight: 1,
        children: [
          createTextNode('Btn Text', 'Manage', 12, 500, cSlate700)
        ]
      }
    ]
  }));

  const dataTable = {
    id: nextId('data_table'),
    name: 'Subscriptions Table',
    type: 'FRAME',
    layoutMode: 'VERTICAL',
    cornerRadius: 12,
    strokes: [{ type: 'SOLID', color: cSlate200 }],
    strokeWeight: 1,
    effects: [{ type: 'DROP_SHADOW', visible: true, radius: 8, color: { r: 0, g: 0, b: 0, a: 0.04 }, offset: { x: 0, y: 4 } }],
    children: [tableHeaderRow, ...tableRows]
  };

  // 5. Hidden designer spec annotations (visible: false)
  // These represent massive Figma plugin artifacts, developer redlines, and layout grids
  const hiddenAnnotationNodes = [];
  for (let a = 0; a < 30; a++) {
    hiddenAnnotationNodes.push({
      id: nextId('hidden_spec_layer'),
      name: `Figma DevMode Spec Redline Layer #${a + 1}`,
      type: 'FRAME',
      visible: false,
      layoutMode: 'NONE',
      absoluteBoundingBox: { x: 100 * (a % 12), y: 50 * a, width: 360, height: 240 },
      children: [
        createVectorNode(`Grid Ruler Path A-${a}`),
        createVectorNode(`Grid Ruler Path B-${a}`),
        createVectorNode(`Alignment Guide C-${a}`),
        createTextNode(
          `Dev Note Text #${a}`,
          `Developer inspection token reference: var(--token-spec-spacing-grid-${a}) with strict constraint bounds on vertical rhythm and contrast ratio threshold >= 4.5:1. Relative transform: [[1, 0, ${a * 10}], [0, 1, ${a * 20}]].`,
          11,
          400
        )
      ]
    });
  }

  const hiddenAnnotationsContainer = {
    id: 'designer_annotations_root',
    name: 'Internal Redline Specs & Grid System',
    type: 'FRAME',
    visible: false,
    layoutMode: 'NONE',
    children: hiddenAnnotationNodes
  };

  // Main Dashboard Content Area
  const mainContent = {
    id: 'main_content_area',
    name: 'Dashboard Content',
    type: 'FRAME',
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    itemSpacing: 24,
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 24,
    paddingBottom: 32,
    fills: [{ type: 'SOLID', color: cSlate50 }],
    children: [headerBar, kpiSection, dataTable]
  };

  // Root Dashboard Frame
  const dashboardRoot = {
    id: '101:2034',
    name: 'Enterprise SaaS Analytics Dashboard',
    type: 'FRAME',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    itemSpacing: 0,
    fills: [{ type: 'SOLID', color: cSlate50 }],
    absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 900 },
    children: [sidebar, mainContent, hiddenAnnotationsContainer]
  };

  // Return wrapped in Figma REST API /v1/files/:key/nodes envelope
  return {
    name: 'Enterprise Cloud System Specs',
    role: 'editor',
    lastModified: '2026-10-25T14:32:00Z',
    thumbnailUrl: 'https://figma.com/sample/thumb.png',
    version: '123456789',
    document: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: []
    },
    nodes: {
      '101:2034': {
        document: dashboardRoot
      }
    }
  };
}

export async function runBenchmark() {
  console.log('================================================================================');
  console.log('       FIGMA-SPEC-COMPRESSOR ENTERPRISE SCALE & BPE TOKEN BENCHMARK             ');
  console.log('================================================================================\n');

  const { encode } = await import('gpt-tokenizer');

  // --- TIER 1: Single SaaS Component (PricingCard) ---
  const tier1Path = path.join(__dirname, 'fixtures', 'saas-pricing-card.json');
  const tier1RawContent = fs.readFileSync(tier1Path, 'utf-8');
  const tier1RawJson = JSON.parse(tier1RawContent);
  const tier1WireJson = JSON.stringify(tier1RawJson);
  const tier1Node = extractFigmaNode(tier1RawJson);
  const tier1Start = performance.now();
  const tier1Result = processAndBenchmark(tier1Node);
  const tier1DurationMs = performance.now() - tier1Start;

  const tier1RawTokens = encode(tier1WireJson).length;
  const tier1CompressedTokens = encode(tier1Result.yaml).length;
  const tier1TokenReduction = Math.round((1 - tier1CompressedTokens / tier1RawTokens) * 100);

  // --- TIER 2: Enterprise SaaS Analytics Dashboard (50k+ Tokens Stress Test) ---
  const tier2Fixture = generateEnterpriseDashboardFixture();
  const tier2WireJson = JSON.stringify(tier2Fixture);
  const tier2Node = extractFigmaNode(tier2Fixture, '101:2034');
  const tier2Start = performance.now();
  const tier2Result = processAndBenchmark(tier2Node);
  const tier2DurationMs = performance.now() - tier2Start;

  const tier2RawTokens = encode(tier2WireJson).length;
  const tier2CompressedTokens = encode(tier2Result.yaml).length;
  const tier2TokenReduction = Math.round((1 - tier2CompressedTokens / tier2RawTokens) * 100);

  const tier1WireBytes = Buffer.byteLength(tier1WireJson, 'utf-8');
  const tier2WireBytes = Buffer.byteLength(tier2WireJson, 'utf-8');

  // Print results table
  console.log('--------------------------------------------------------------------------------');
  console.log('  BENCHMARK SUITE METRICS SUMMARY (MINIFIED WIRE JSON)');
  console.log('--------------------------------------------------------------------------------');
  console.log(`TIER 1: ${tier1RawJson.name}`);
  console.log(`  Raw AST Nodes:        ${tier1Result.metrics.rawNodesCount}`);
  console.log(`  Clean Spec Nodes:     ${tier1Result.metrics.cleanNodesCount}`);
  console.log(`  Raw Wire JSON Size:   ${(tier1WireBytes / 1024).toFixed(2)} KB`);
  console.log(`  Compressed Spec Size: ${(tier1Result.metrics.yamlBytes / 1024).toFixed(2)} KB`);
  console.log(`  Wire Raw BPE Tokens:  ${tier1RawTokens.toLocaleString()}`);
  console.log(`  Exact Spec Tokens:    ${tier1CompressedTokens.toLocaleString()}`);
  console.log(`  Token Reduction:      \x1b[32m${tier1TokenReduction}%\x1b[0m (Target >= 80%)`);
  console.log(`  Execution Latency:    ${tier1DurationMs.toFixed(2)} ms`);
  console.log('--------------------------------------------------------------------------------');
  console.log(`TIER 2: ${tier2Node.name} (Enterprise Scale Stress Test)`);
  console.log(`  Raw AST Nodes:        ${tier2Result.metrics.rawNodesCount}`);
  console.log(`  Clean Spec Nodes:     ${tier2Result.metrics.cleanNodesCount}`);
  console.log(`  Raw Wire JSON Size:   ${(tier2WireBytes / 1024).toFixed(2)} KB`);
  console.log(`  Compressed Spec Size: ${(tier2Result.metrics.yamlBytes / 1024).toFixed(2)} KB`);
  console.log(`  Wire Raw BPE Tokens:  ${tier2RawTokens.toLocaleString()} (Target >= 50,000)`);
  console.log(`  Exact Spec Tokens:    ${tier2CompressedTokens.toLocaleString()} (Target <= 10,000)`);
  console.log(`  Token Reduction:      \x1b[32m${tier2TokenReduction}%\x1b[0m (Target >= 80%)`);
  console.log(`  Execution Latency:    ${tier2DurationMs.toFixed(2)} ms (Target < 300ms)`);
  console.log('================================================================================\n');

  const tier1Pass = tier1TokenReduction >= 80;
  const tier2Pass =
    tier2RawTokens >= 50000 &&
    tier2CompressedTokens <= 10000 &&
    tier2TokenReduction >= 80 &&
    tier2DurationMs < 300;

  if (tier1Pass && tier2Pass) {
    console.log('\x1b[32m[PASS] ALL BENCHMARK TIERS VERIFIED: >= 80% BPE Token Reduction Achieved!\x1b[0m');
    return {
      tier1: {
        rawTokens: tier1RawTokens,
        compTokens: tier1CompressedTokens,
        reduction: tier1TokenReduction,
        durationMs: tier1DurationMs
      },
      tier2: {
        rawTokens: tier2RawTokens,
        compTokens: tier2CompressedTokens,
        reduction: tier2TokenReduction,
        durationMs: tier2DurationMs
      }
    };
  } else {
    console.error('\x1b[31m[FAIL] One or more benchmark thresholds failed.\x1b[0m');
    process.exit(1);
  }
}

const isDirectRun = Boolean(
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
);

if (isDirectRun) {
  runBenchmark();
}

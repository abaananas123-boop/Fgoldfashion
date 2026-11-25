import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BarChart3, ExternalLink, Mail, RotateCcw, Trash2, Truck } from 'lucide-react';
import {
  CategoryFilter,
  DEFAULT_CATEGORIES,
  OrderRecord,
  Product,
  ProductCategory,
  SubscriberRecord,
} from '../types';
import { formatPKR } from '../utils/currency';
import {
  buildCustomerConfirmationWhatsAppUrl,
  buildOrderWhatsAppUrl,
  formatOrderPaymentLabel,
} from '../utils/social';
import { WhatsAppIcon } from './SocialIcons';

interface StatisticsPanelProps {
  orders: OrderRecord[];
  subscribers?: SubscriberRecord[];
  products: Product[];
  categories?: string[];
  accentColor: string;
  storeName?: string;
  storeWhatsappNumber?: string;
  onResetSampleOrders: () => void;
  onClearOrders: () => void;
  onDeleteSubscriber?: (subscriberId: string) => void;
  onManageOrderTracking?: (orderNumber: string) => void;
}

type ChartMetric = 'revenue' | 'units';

interface ProductStat {
  productId: string;
  name: string;
  category: ProductCategory | 'Catalog Item';
  units: number;
  revenue: number;
  orderCount: number;
}

interface DailyRevenuePoint {
  dateLabel: string;
  revenue: number;
  ordersCount: number;
}

interface CategoryShare {
  category: string;
  revenue: number;
  units: number;
}

const CATEGORY_PALETTE = [
  '#6D2932',
  '#141413',
  '#8C6239',
  '#4A5D52',
  '#6B7280',
  '#A15A56',
  '#9A7B56',
];

export function StatisticsPanel({
  orders,
  subscribers = [],
  products,
  categories = DEFAULT_CATEGORIES,
  accentColor,
  storeName = 'f. Gold & fashion',
  storeWhatsappNumber = '',
  onResetSampleOrders,
  onClearOrders,
  onDeleteSubscriber,
  onManageOrderTracking,
}: StatisticsPanelProps) {
  const categoryTabs: CategoryFilter[] = useMemo(() => {
    const merged = new Set<string>(categories);
    for (const product of products) {
      if (product.category?.trim()) merged.add(product.category.trim());
    }
    return ['All', ...Array.from(merged)];
  }, [categories, products]);
  const [metric, setMetric] = useState<ChartMetric>('revenue');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [hoveredProduct, setHoveredProduct] = useState<ProductStat | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DailyRevenuePoint | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<CategoryShare | null>(null);

  const barContainerRef = useRef<HTMLDivElement | null>(null);
  const barSvgRef = useRef<SVGSVGElement | null>(null);
  const trendContainerRef = useRef<HTMLDivElement | null>(null);
  const trendSvgRef = useRef<SVGSVGElement | null>(null);
  const donutSvgRef = useRef<SVGSVGElement | null>(null);

  const [barWidth, setBarWidth] = useState(640);
  const [trendWidth, setTrendWidth] = useState(440);

  const productLookup = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
      map.set(product.id, product);
    }
    return map;
  }, [products]);

  const {
    totalRevenue,
    productRevenueTotal,
    totalUnits,
    averageOrderValue,
    productStats,
    dailySeries,
    categoryShares,
  } = useMemo(() => {
    const productMap = new Map<
      string,
      ProductStat & { orderNumbers: Set<string> }
    >();
    const dayMap = new Map<string, { revenue: number; ordersCount: number }>();
    const categoryMap = new Map<string, { revenue: number; units: number }>();

    let revSum = 0;
    let productRevSum = 0;
    let unitsSum = 0;

    for (const order of orders) {
      // Track revenue at the order level for the daily trend unless filtered by category
      let orderFilteredRevenue = 0;
      let orderMatched = false;

      for (const item of order.items) {
        const catalogProduct = productLookup.get(item.productId);
        const category: ProductCategory | 'Catalog Item' =
          catalogProduct?.category ?? 'Catalog Item';

        if (categoryFilter !== 'All' && category !== categoryFilter) {
          continue;
        }

        orderMatched = true;
        const lineRevenue = item.unitPrice * item.quantity;
        orderFilteredRevenue += lineRevenue;
        productRevSum += lineRevenue;
        unitsSum += item.quantity;

        const existing = productMap.get(item.productId);
        if (existing) {
          existing.units += item.quantity;
          existing.revenue += lineRevenue;
          existing.orderNumbers.add(order.orderNumber);
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            name: catalogProduct?.name ?? item.name,
            category,
            units: item.quantity,
            revenue: lineRevenue,
            orderCount: 1,
            orderNumbers: new Set([order.orderNumber]),
          });
        }

        const catEntry = categoryMap.get(category) ?? { revenue: 0, units: 0 };
        catEntry.revenue += lineRevenue;
        catEntry.units += item.quantity;
        categoryMap.set(category, catEntry);
      }

      if (categoryFilter === 'All') {
        revSum += order.total;
        const dayEntry = dayMap.get(order.createdAt) ?? {
          revenue: 0,
          ordersCount: 0,
        };
        dayEntry.revenue += order.total;
        dayEntry.ordersCount += 1;
        dayMap.set(order.createdAt, dayEntry);
      } else if (orderMatched) {
        revSum += orderFilteredRevenue;
        const dayEntry = dayMap.get(order.createdAt) ?? {
          revenue: 0,
          ordersCount: 0,
        };
        dayEntry.revenue += orderFilteredRevenue;
        dayEntry.ordersCount += 1;
        dayMap.set(order.createdAt, dayEntry);
      }
    }

    const stats: ProductStat[] = Array.from(productMap.values())
      .map((entry) => ({
        productId: entry.productId,
        name: entry.name,
        category: entry.category,
        units: entry.units,
        revenue: entry.revenue,
        orderCount: entry.orderNumbers.size,
      }))
      .sort((a, b) =>
        metric === 'revenue'
          ? b.revenue - a.revenue || b.units - a.units
          : b.units - a.units || b.revenue - a.revenue
      );

    const series: DailyRevenuePoint[] = Array.from(dayMap.entries())
      .map(([dateLabel, info]) => ({
        dateLabel,
        revenue: info.revenue,
        ordersCount: info.ordersCount,
      }))
      .sort((a, b) => {
        const ta = Date.parse(a.dateLabel);
        const tb = Date.parse(b.dateLabel);
        if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
        return a.dateLabel.localeCompare(b.dateLabel);
      });

    const categories: CategoryShare[] = Array.from(categoryMap.entries())
      .map(([category, info]) => ({
        category,
        revenue: info.revenue,
        units: info.units,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const activeOrderCount =
      categoryFilter === 'All'
        ? orders.length
        : new Set(
            orders
              .filter((o) =>
                o.items.some(
                  (i) =>
                    (productLookup.get(i.productId)?.category ?? 'Catalog Item') ===
                    categoryFilter
                )
              )
              .map((o) => o.orderNumber)
          ).size;

    return {
      totalRevenue: revSum,
      productRevenueTotal: productRevSum,
      totalUnits: unitsSum,
      averageOrderValue:
        activeOrderCount > 0 ? Math.round(revSum / activeOrderCount) : 0,
      productStats: stats,
      dailySeries: series,
      categoryShares: categories,
    };
  }, [orders, productLookup, categoryFilter, metric]);

  const topSeller = productStats[0] ?? null;

  // Observe responsive container widths for D3 SVGs
  useEffect(() => {
    const observers: ResizeObserver[] = [];
    if (barContainerRef.current) {
      const ro = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width;
        if (w && w > 180) setBarWidth(Math.floor(w));
      });
      ro.observe(barContainerRef.current);
      observers.push(ro);
    }
    if (trendContainerRef.current) {
      const ro = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width;
        if (w && w > 180) setTrendWidth(Math.floor(w));
      });
      ro.observe(trendContainerRef.current);
      observers.push(ro);
    }
    return () => observers.forEach((ro) => ro.disconnect());
  }, [orders.length, categoryFilter]);

  // 1. D3 Horizontal Bar Chart: Best-Selling Products
  useEffect(() => {
    const svgEl = barSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (productStats.length === 0) return;

    const rowHeight = 44;
    const margin = {
      top: 10,
      right: metric === 'revenue' ? 105 : 74,
      bottom: 30,
      left: Math.min(200, Math.max(135, Math.floor(barWidth * 0.34))),
    };
    const innerWidth = Math.max(120, barWidth - margin.left - margin.right);
    const innerHeight = productStats.length * rowHeight;
    const totalHeight = innerHeight + margin.top + margin.bottom;

    svg.attr('viewBox', `0 0 ${barWidth} ${totalHeight}`).attr('height', totalHeight);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxVal =
      d3.max(productStats, (d) => (metric === 'revenue' ? d.revenue : d.units)) ??
      1;

    const x = d3
      .scaleLinear()
      .domain([0, maxVal * 1.08])
      .nice()
      .range([0, innerWidth]);

    const y = d3
      .scaleBand<string>()
      .domain(productStats.map((d) => d.productId))
      .range([0, innerHeight])
      .padding(0.28);

    // Subtle vertical gridlines
    const ticks = x.ticks(4);
    g.append('g')
      .selectAll('line')
      .data(ticks)
      .join('line')
      .attr('x1', (d) => x(d))
      .attr('x2', (d) => x(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#E4E4E0')
      .attr('stroke-dasharray', '2,2');

    // Bottom axis
    const xAxis = d3
      .axisBottom(x)
      .ticks(4)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat((val) => {
        const n = Number(val);
        if (metric === 'revenue') {
          if (n === 0) return 'Rs. 0';
          return n >= 1000 ? `Rs. ${Math.round(n / 1000)}k` : `Rs. ${n}`;
        }
        return `${n}`;
      });

    const axisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    axisGroup.select('.domain').attr('stroke', '#E4E4E0');
    axisGroup
      .selectAll('text')
      .attr('fill', '#5A5A56')
      .attr('font-size', '11px')
      .style('font-variant-numeric', 'tabular-nums');

    // Product label column on left
    g.selectAll('.product-label')
      .data(productStats)
      .join('text')
      .attr('class', 'product-label')
      .attr('x', -10)
      .attr('y', (d) => (y(d.productId) ?? 0) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#141413')
      .attr('font-size', '12px')
      .attr('font-weight', (_, i) => (i === 0 ? '600' : '400'))
      .text((d) => {
        const maxChars = margin.left < 160 ? 18 : 25;
        return d.name.length > maxChars
          ? `${d.name.slice(0, maxChars - 1)}…`
          : d.name;
      });

    // Horizontal bars
    g.selectAll('.bar')
      .data(productStats)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => y(d.productId) ?? 0)
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('width', (d) =>
        Math.max(4, x(metric === 'revenue' ? d.revenue : d.units))
      )
      .attr('fill', (_, i) => (i === 0 ? accentColor : '#141413'))
      .attr('opacity', (_, i) => (i === 0 ? 1 : Math.max(0.45, 0.88 - i * 0.08)))
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setHoveredProduct(d))
      .on('mouseleave', () => setHoveredProduct(null));

    // Direct value readout at end of each bar
    g.selectAll('.value-label')
      .data(productStats)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', (d) =>
        Math.max(4, x(metric === 'revenue' ? d.revenue : d.units)) + 8
      )
      .attr('y', (d) => (y(d.productId) ?? 0) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#141413')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .style('font-variant-numeric', 'tabular-nums')
      .text((d) =>
        metric === 'revenue'
          ? formatPKR(d.revenue)
          : `${d.units} ${d.units === 1 ? 'unit' : 'units'}`
      );
  }, [productStats, metric, barWidth, accentColor]);

  // 2. D3 Area / Line Chart: PKR Revenue by Order Date
  useEffect(() => {
    const svgEl = trendSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (dailySeries.length === 0) return;

    const height = 220;
    const margin = { top: 16, right: 20, bottom: 32, left: 62 };
    const innerWidth = Math.max(120, trendWidth - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${trendWidth} ${height}`).attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scalePoint<string>()
      .domain(dailySeries.map((d) => d.dateLabel))
      .range([0, innerWidth])
      .padding(0.2);

    const maxRev = d3.max(dailySeries, (d) => d.revenue) ?? 1000;
    const y = d3
      .scaleLinear()
      .domain([0, maxRev * 1.15])
      .nice()
      .range([innerHeight, 0]);

    // Horizontal gridlines
    g.append('g')
      .selectAll('line')
      .data(y.ticks(4))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', '#E4E4E0')
      .attr('stroke-dasharray', '2,2');

    // Y axis
    const yAxis = d3
      .axisLeft(y)
      .ticks(4)
      .tickSize(0)
      .tickPadding(8)
      .tickFormat((val) => {
        const n = Number(val);
        if (n === 0) return 'Rs. 0';
        return n >= 1000 ? `Rs. ${Math.round(n / 1000)}k` : `Rs. ${n}`;
      });

    const yAxisG = g.append('g').call(yAxis);
    yAxisG.select('.domain').remove();
    yAxisG
      .selectAll('text')
      .attr('fill', '#5A5A56')
      .attr('font-size', '11px')
      .style('font-variant-numeric', 'tabular-nums');

    // X axis
    const xAxis = d3
      .axisBottom(x)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat((label) => label.replace(/,\s*\d{4}$/, ''));

    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisG.select('.domain').attr('stroke', '#E4E4E0');
    xAxisG.selectAll('text').attr('fill', '#5A5A56').attr('font-size', '11px');

    if (dailySeries.length > 1) {
      const areaGen = d3
        .area<DailyRevenuePoint>()
        .x((d) => x(d.dateLabel) ?? 0)
        .y0(innerHeight)
        .y1((d) => y(d.revenue))
        .curve(d3.curveMonotoneX);

      const lineGen = d3
        .line<DailyRevenuePoint>()
        .x((d) => x(d.dateLabel) ?? 0)
        .y((d) => y(d.revenue))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(dailySeries)
        .attr('d', areaGen)
        .attr('fill', accentColor)
        .attr('opacity', 0.1);

      g.append('path')
        .datum(dailySeries)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', accentColor)
        .attr('stroke-width', 2);
    }

    // Data points
    g.selectAll('.rev-point')
      .data(dailySeries)
      .join('circle')
      .attr('class', 'rev-point')
      .attr('cx', (d) => x(d.dateLabel) ?? 0)
      .attr('cy', (d) => y(d.revenue))
      .attr('r', 5)
      .attr('fill', '#FFFFFF')
      .attr('stroke', accentColor)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setHoveredDay(d))
      .on('mouseleave', () => setHoveredDay(null));
  }, [dailySeries, trendWidth, accentColor]);

  // 3. D3 Donut Chart: PKR Revenue by Category
  useEffect(() => {
    const svgEl = donutSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (categoryShares.length === 0) return;

    const size = 184;
    const radius = size / 2;
    const innerRadius = radius * 0.62;
    const outerRadius = radius - 6;

    svg.attr('viewBox', `0 0 ${size} ${size}`).attr('width', size).attr('height', size);

    const g = svg
      .append('g')
      .attr('transform', `translate(${radius},${radius})`);

    const pieGen = d3
      .pie<CategoryShare>()
      .value((d) => d.revenue)
      .sort(null)
      .padAngle(0.025);

    const arcGen = d3
      .arc<d3.PieArcDatum<CategoryShare>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(2);

    const palette = [accentColor, ...CATEGORY_PALETTE.slice(1)];

    g.selectAll('path')
      .data(pieGen(categoryShares))
      .join('path')
      .attr('d', arcGen)
      .attr('fill', (_, i) => palette[i % palette.length])
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setHoveredCategory(d.data))
      .on('mouseleave', () => setHoveredCategory(null));
  }, [categoryShares, accentColor]);

  const categoryColorList = [accentColor, ...CATEGORY_PALETTE.slice(1)];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Toolbar: Filter & Ledger Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E4E0]">
        <div
          role="tablist"
          aria-label="Filter statistics by category"
          className="flex items-center gap-1 p-1 bg-[#F2F2F0] rounded-md overflow-x-auto"
        >
          {categoryTabs.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-white text-[#141413] shadow-xs'
                  : 'text-[#5A5A56] hover:text-[#141413]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onResetSampleOrders}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5A5A56] border border-[#D4D4CE] rounded-md hover:text-[#141413] hover:border-[#141413] transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore Sample Sales</span>
          </button>
          {orders.length > 0 && (
            <button
              type="button"
              onClick={onClearOrders}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5A5A56] border border-[#D4D4CE] rounded-md hover:text-[#6D2932] hover:border-[#6D2932] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Ledger</span>
            </button>
          )}
        </div>
      </div>

      {orders.length === 0 || productStats.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white border border-[#E4E4E0] rounded-lg space-y-3">
          <BarChart3
            className="w-8 h-8 text-[#5A5A56]/60 mx-auto"
            strokeWidth={1.5}
          />
          <h3 className="font-serif text-2xl text-[#141413]">
            {orders.length === 0
              ? 'No completed orders recorded yet'
              : `No sales recorded in ${categoryFilter}`}
          </h3>
          <p className="text-xs text-[#5A5A56] max-w-md mx-auto leading-relaxed">
            {orders.length === 0
              ? 'Orders placed through the storefront checkout automatically populate your PKR revenue and best-seller charts here. You can also load the sample store ledger to inspect charts immediately.'
              : 'Switch back to All categories or place an order containing products from this category.'}
          </p>
          <div className="pt-2">
            {orders.length === 0 ? (
              <button
                type="button"
                onClick={onResetSampleOrders}
                className="px-4 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
              >
                Load Sample Sales Ledger
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                className="px-4 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
              >
                Show All Categories
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 4-Column Financial & Sales Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E4E4E0] rounded-lg p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#5A5A56] mb-1">
                Total Revenue (PKR)
              </p>
              <p className="font-serif text-2xl font-medium text-[#141413] tabular-nums">
                {formatPKR(totalRevenue)}
              </p>
              <p className="text-[11px] text-[#5A5A56] mt-1 tabular-nums">
                Across {orders.length} {orders.length === 1 ? 'order' : 'orders'}
              </p>
            </div>

            <div className="bg-white border border-[#E4E4E0] rounded-lg p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#5A5A56] mb-1">
                Units Sold
              </p>
              <p className="font-serif text-2xl font-medium text-[#141413] tabular-nums">
                {totalUnits}
              </p>
              <p className="text-[11px] text-[#5A5A56] mt-1 tabular-nums">
                {productStats.length} active SKUs sold
              </p>
            </div>

            <div className="bg-white border border-[#E4E4E0] rounded-lg p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#5A5A56] mb-1">
                Avg. Order Value
              </p>
              <p className="font-serif text-2xl font-medium text-[#141413] tabular-nums">
                {formatPKR(averageOrderValue)}
              </p>
              <p className="text-[11px] text-[#5A5A56] mt-1">
                Pakistani Rupees
              </p>
            </div>

            <div className="bg-white border border-[#E4E4E0] rounded-lg p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#5A5A56] mb-1">
                #1 Best Seller
              </p>
              <p className="font-serif text-lg font-medium text-[#141413] truncate">
                {topSeller?.name ?? '—'}
              </p>
              <p className="text-[11px] text-[var(--accent)] font-medium mt-1 tabular-nums">
                {topSeller
                  ? `${formatPKR(topSeller.revenue)} · ${topSeller.units} units`
                  : ''}
              </p>
            </div>
          </div>

          {/* Chart 1: D3 Best-Selling Products Horizontal Bar Chart */}
          <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#141413]">
                  Best-Selling Products ({metric === 'revenue' ? 'Revenue in PKR' : 'Units Sold'})
                </h3>
                <p className="text-xs text-[#5A5A56]">
                  {hoveredProduct
                    ? `${hoveredProduct.name} — ${formatPKR(hoveredProduct.revenue)} from ${hoveredProduct.units} units across ${hoveredProduct.orderCount} orders`
                    : 'Ranked highest to lowest. Hover any bar for full product breakdown.'}
                </p>
              </div>

              <div
                role="group"
                aria-label="Chart metric"
                className="flex items-center gap-1 p-1 bg-[#F2F2F0] rounded-md shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setMetric('revenue')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                    metric === 'revenue'
                      ? 'bg-white text-[#141413] shadow-xs'
                      : 'text-[#5A5A56] hover:text-[#141413]'
                  }`}
                >
                  PKR Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setMetric('units')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                    metric === 'units'
                      ? 'bg-white text-[#141413] shadow-xs'
                      : 'text-[#5A5A56] hover:text-[#141413]'
                  }`}
                >
                  Units Sold
                </button>
              </div>
            </div>

            <div ref={barContainerRef} className="w-full overflow-hidden">
              <svg
                ref={barSvgRef}
                role="img"
                aria-label="D3 bar chart of best-selling store products in PKR"
                className="w-full block select-none"
              />
            </div>
          </div>

          {/* Chart Row 2: D3 Revenue Trend + D3 Category Revenue Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#141413]">
                  Total Revenue Trend (PKR)
                </h3>
                <p className="text-xs text-[#5A5A56] tabular-nums">
                  {hoveredDay
                    ? `${hoveredDay.dateLabel}: ${formatPKR(hoveredDay.revenue)} (${hoveredDay.ordersCount} ${hoveredDay.ordersCount === 1 ? 'order' : 'orders'})`
                    : 'Daily sales trajectory across recorded orders.'}
                </p>
              </div>

              <div ref={trendContainerRef} className="w-full overflow-hidden">
                <svg
                  ref={trendSvgRef}
                  role="img"
                  aria-label="D3 area chart showing PKR revenue over time"
                  className="w-full block select-none"
                />
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-3 flex flex-col">
              <div>
                <h3 className="text-sm font-semibold text-[#141413]">
                  Revenue by Category
                </h3>
                <p className="text-xs text-[#5A5A56] tabular-nums">
                  {hoveredCategory
                    ? `${hoveredCategory.category}: ${formatPKR(hoveredCategory.revenue)} (${hoveredCategory.units} units)`
                    : 'Share of total PKR revenue.'}
                </p>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-between gap-4 pt-1">
                <div className="relative shrink-0">
                  <svg
                    ref={donutSvgRef}
                    role="img"
                    aria-label="D3 donut chart of revenue by store category"
                    className="block select-none"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                    <span className="text-[10px] uppercase tracking-wider text-[#5A5A56]">
                      {hoveredCategory ? hoveredCategory.category : 'Total PKR'}
                    </span>
                    <span className="text-xs font-semibold text-[#141413] tabular-nums mt-0.5">
                      {formatPKR(
                        hoveredCategory ? hoveredCategory.revenue : totalRevenue
                      )}
                    </span>
                  </div>
                </div>

                <ul className="w-full space-y-2 text-xs">
                  {categoryShares.map((cat, idx) => {
                    const pct =
                      productRevenueTotal > 0
                        ? Math.round((cat.revenue / productRevenueTotal) * 100)
                        : 0;
                    return (
                      <li
                        key={cat.category}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{
                              backgroundColor:
                                categoryColorList[idx % categoryColorList.length],
                            }}
                          />
                          <span className="text-[#141413] truncate">
                            {cat.category}
                          </span>
                        </div>
                        <span className="text-[#5A5A56] tabular-nums shrink-0">
                          {pct}% · {formatPKR(cat.revenue)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* Product Ranking Ledger Table */}
          <div className="bg-white border border-[#E4E4E0] rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E4E4E0] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#141413]">
                Product Sales Ledger
              </h3>
              <span className="text-xs text-[#5A5A56] tabular-nums">
                {productStats.length} products ranked
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E4E4E0] bg-[#FAFAFA] text-[#5A5A56]">
                    <th className="py-2.5 px-4 font-medium">Rank</th>
                    <th className="py-2.5 px-4 font-medium">Product</th>
                    <th className="py-2.5 px-4 font-medium">Category</th>
                    <th className="py-2.5 px-4 font-medium text-right">Units</th>
                    <th className="py-2.5 px-4 font-medium text-right">Share</th>
                    <th className="py-2.5 px-4 font-medium text-right">
                      Revenue (PKR)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E0]">
                  {productStats.map((row, idx) => {
                    const share =
                      productRevenueTotal > 0
                        ? ((row.revenue / productRevenueTotal) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <tr
                        key={row.productId}
                        className="hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="py-2.5 px-4 text-[#5A5A56] tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-[#141413]">
                          {row.name}
                        </td>
                        <td className="py-2.5 px-4 text-[#5A5A56]">
                          {row.category}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-[#141413]">
                          {row.units}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-[#5A5A56]">
                          {share}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold tabular-nums text-[#141413]">
                          {formatPKR(row.revenue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Orders & WhatsApp Dispatch Ledger */}
          <div className="bg-white border border-[#E4E4E0] rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E4E4E0] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#141413]">
                  Customer Orders &amp; WhatsApp Dispatch
                </h3>
                <p className="text-[11px] text-[#5A5A56]">
                  {storeWhatsappNumber.trim()
                    ? `Store WhatsApp recipient: ${storeWhatsappNumber}`
                    : 'Save your WhatsApp Store Number in Social & WhatsApp to forward order details in one click.'}
                </p>
              </div>
              <span className="text-xs text-[#5A5A56] tabular-nums">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
              </span>
            </div>

            <div className="divide-y divide-[#E4E4E0]">
              {orders.map((order) => {
                const forwardUrl = buildOrderWhatsAppUrl(
                  storeWhatsappNumber,
                  order,
                  storeName
                );
                const customerUrl = buildCustomerConfirmationWhatsAppUrl(
                  order,
                  storeName
                );
                return (
                  <div
                    key={order.orderNumber}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#141413] tabular-nums">
                          #{order.orderNumber}
                        </span>
                        <span className="text-[#5A5A56]">·</span>
                        <span className="font-medium text-[var(--accent)]">
                          {order.status}
                        </span>
                        <span className="text-[#5A5A56]">·</span>
                        <span className="font-medium text-[#141413]">
                          {order.shipping.fullName}
                        </span>
                        <span className="text-[#5A5A56]">·</span>
                        <span className="text-[#5A5A56] tabular-nums">
                          {order.shipping.phone}
                        </span>
                        <span className="text-[#5A5A56]">·</span>
                        <span className="text-[#5A5A56]">{order.createdAt}</span>
                      </div>
                      <p className="text-[11px] text-[#5A5A56]">
                        {order.shipping.address}, {order.shipping.city},{' '}
                        {order.shipping.postalCode} · {order.shipping.email}
                      </p>
                      <p className="text-[11px] text-[#141413]">
                        {order.items
                          .map(
                            (i) =>
                              `${i.quantity}x ${i.name} (${i.variantName})${
                                i.customNote?.trim() ? ` [${i.customNote.trim()}]` : ''
                              }`
                          )
                          .join(', ')}{' '}
                        —{' '}
                        <span className="font-semibold tabular-nums">
                          {formatPKR(order.total)}
                        </span>{' '}
                        <span className="text-[#5A5A56]">
                          ({formatOrderPaymentLabel(order.paymentMethod)})
                        </span>
                      </p>
                      {order.orderNote && (
                        <p className="text-[11px] text-[var(--accent)]">
                          Customer Note: {order.orderNote}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {onManageOrderTracking && (
                        <button
                          type="button"
                          onClick={() => onManageOrderTracking(order.orderNumber)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-[var(--accent)] text-white rounded hover:opacity-95 transition-opacity cursor-pointer whitespace-nowrap"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Publish Tracking</span>
                        </button>
                      )}
                      {forwardUrl && (
                        <a
                          href={forwardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-[#141413] text-white rounded hover:bg-[#2B2B29] transition-colors whitespace-nowrap"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          <span>Forward to My WhatsApp</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {customerUrl && (
                        <a
                          href={customerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#141413] border border-[#D4D4CE] rounded hover:border-[#141413] transition-colors whitespace-nowrap"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>Message Customer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Newsletter Subscribers List (Admin-only) */}
      <div className="bg-white border border-[#E4E4E0] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E4E4E0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} />
            <div>
              <h3 className="text-sm font-semibold text-[#141413]">
                Newsletter Subscribers
              </h3>
              <p className="text-[11px] text-[#5A5A56]">
                Emails submitted through the footer newsletter form in Firestore.
              </p>
            </div>
          </div>
          <span className="text-xs text-[#5A5A56] tabular-nums">
            {subscribers.length}{' '}
            {subscribers.length === 1 ? 'subscriber' : 'subscribers'}
          </span>
        </div>

        {subscribers.length === 0 ? (
          <p className="p-5 text-xs text-[#5A5A56]">
            No newsletter subscribers recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-[#E4E4E0]">
            {subscribers.map((sub) => (
              <div
                key={sub.id}
                className="px-5 py-3 flex items-center justify-between gap-4 text-xs hover:bg-[#FAFAFA] transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#141413] truncate">
                    {sub.email}
                  </p>
                  <p className="text-[11px] text-[#5A5A56]">
                    Subscribed {sub.subscribedAt} · Source: {sub.source}
                  </p>
                </div>
                {onDeleteSubscriber && (
                  <button
                    type="button"
                    onClick={() => onDeleteSubscriber(sub.id)}
                    aria-label={`Remove ${sub.email}`}
                    className="p-1.5 text-[#5A5A56] hover:text-[var(--accent)] rounded cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { createChart, ColorType, IChartApi, ISeriesApi, Time, AreaSeries } from 'lightweight-charts';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketHistory } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import { cn } from '@/lib/cn';

interface MarketChartProps {
    marketId: string;
    numericMarketId?: string | number;
    yesPrice?: number;
}

type PricePoint = { timestamp: number; yesPrice: number; noPrice: number };

export function MarketChart({ marketId, numericMarketId, yesPrice: currentYesPrice }: MarketChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartApiRef = useRef<IChartApi | null>(null);
    const seriesApiRef = useRef<ISeriesApi<"Area"> | null>(null);
    const [hoveredData, setHoveredData] = useState<{ price: number; date: string } | null>(null);
    const [history, setHistory] = useState<PricePoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const lastTimeRef = useRef<number>(0);

    const { data: initialHistory } = useQuery({
        queryKey: ['marketHistory', marketId],
        queryFn: () => fetchMarketHistory(marketId),
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (initialHistory) {
            setHistory(initialHistory);
            setIsLoading(false);
        }
    }, [initialHistory]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!numericMarketId) return;

        const channel = supabase
            .channel(`price_snapshots:market_${numericMarketId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'price_snapshots',
                    filter: `market_id=eq.${numericMarketId}`,
                },
                (payload) => {
                    const row = payload.new;
                    const newPoint: PricePoint = {
                        timestamp: new Date(row.timestamp).getTime(),
                        yesPrice: parseFloat(row.yes_price),
                        noPrice: parseFloat(row.no_price),
                    };

                    setHistory(prev => [...prev, newPoint]);

                    const series = seriesApiRef.current;
                    const chart = chartApiRef.current;
                    if (series && chart) {
                        const timeSec = Math.floor(newPoint.timestamp / 1000);
                        if (timeSec > lastTimeRef.current) {
                            lastTimeRef.current = timeSec;
                            series.update({ time: timeSec as Time, value: newPoint.yesPrice });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [numericMarketId, mounted]);

    const { endPrice, changePercent, isPositive } = useMemo(() => {
        if (history.length === 0) return { endPrice: 0.5, changePercent: 0, isPositive: true };
        const start = history[0].yesPrice;
        const end = history[history.length - 1].yesPrice;
        const change = end - start;
        const changePercent = start > 0 ? (change / start) * 100 : 0;
        return { endPrice: end, changePercent, isPositive: change >= 0 };
    }, [history]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#71717a',
            },
            grid: {
                vertLines: { color: 'rgba(39, 39, 42, 0.5)' },
                horzLines: { color: 'rgba(39, 39, 42, 0.5)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: '#27272a',
            },
            rightPriceScale: {
                borderColor: '#27272a',
            },
        });

        const series = chart.addSeries(AreaSeries, {
            lineColor: '#55D292',
            topColor: 'rgba(85, 210, 146, 0.3)',
            bottomColor: 'rgba(85, 210, 146, 0.0)',
            lineWidth: 2,
        });

        chart.timeScale().fitContent();

        chartApiRef.current = chart;
        seriesApiRef.current = series;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        chart.subscribeCrosshairMove(param => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > chartContainerRef.current!.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartContainerRef.current!.clientHeight
            ) {
                setHoveredData(null);
            } else {
                const data = param.seriesData.get(series);
                const price = data ? (data as any).value : undefined;
                if (price !== undefined) {
                    setHoveredData({
                        price,
                        date: dayjs((param.time as number) * 1000).format('MMM D, HH:mm'),
                    });
                }
            }
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartApiRef.current = null;
            seriesApiRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const series = seriesApiRef.current;
        const chart = chartApiRef.current;
        if (!series || !chart || history.length === 0) return;

        series.applyOptions({
            lineColor: isPositive ? '#55D292' : '#FF4444',
            topColor: isPositive ? 'rgba(85, 210, 146, 0.3)' : 'rgba(255, 68, 68, 0.3)',
            bottomColor: isPositive ? 'rgba(85, 210, 146, 0.0)' : 'rgba(255, 68, 68, 0.0)',
        });

        const data = history.map(h => ({
            time: Math.floor(h.timestamp / 1000) as Time,
            value: h.yesPrice,
        }));

        const deduped = new Map<number, { time: Time; value: number }>();
        for (const point of data) {
            deduped.set(point.time as number, point);
        }
        const sortedData = Array.from(deduped.values()).sort((a, b) => (a.time as number) - (b.time as number));

        if (sortedData.length > 0) {
            lastTimeRef.current = sortedData[sortedData.length - 1].time as number;
            series.setData(sortedData);
            chart.timeScale().fitContent();
        }
    }, [history, isPositive]);

    const displayPrice = hoveredData ? hoveredData.price : endPrice;
    const displayDate = hoveredData ? hoveredData.date : dayjs(history.length > 0 ? history[history.length - 1].timestamp : Date.now()).format('MMM D, HH:mm');
    const displayProb = (displayPrice * 100).toFixed(1);

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <span className="text-[11px] text-[var(--text-muted)] uppercase font-medium tracking-wide">Pump Probability</span>
                    <div className="text-[28px] font-mono font-bold text-white mb-0.5">
                        {displayProb}%
                    </div>
                    <div className={cn("text-[12px] font-medium flex items-center gap-1", isPositive ? "text-[var(--pump-color)]" : "text-[var(--dump-color)]")}>
                        {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
                        <span className="text-[var(--text-muted)] ml-1">All time</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[11px] text-[var(--text-muted)]">{displayDate}</span>
                </div>
            </div>

            <div ref={chartContainerRef} className="w-full h-[300px] relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--pump-color)] rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import { createChart, ColorType, AreaSeries } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { PricePoint } from '@/types/market';

interface ChartProps {
    data: PricePoint[];
    outcome?: 'Yes' | 'No';
}

export function Chart({ data, outcome = 'Yes' }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const isYes = outcome === 'Yes';
    const lineColor = isYes ? '#55D292' : '#FF4444';
    const topColor = isYes ? 'rgba(85, 210, 146, 0.3)' : 'rgba(255, 68, 68, 0.3)';
    const bottomColor = isYes ? 'rgba(85, 210, 146, 0.0)' : 'rgba(255, 68, 68, 0.0)';

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#71717a',
                fontFamily: 'Inter',
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: 'rgba(39, 39, 42, 0.5)' },
                horzLines: { color: 'rgba(39, 39, 42, 0.5)' },
            },
            timeScale: {
                borderColor: '#27272a',
                timeVisible: true,
            },
            rightPriceScale: {
                borderColor: '#27272a',
            },
            crosshair: {
                vertLine: {
                    color: 'rgba(153, 69, 255, 0.5)',
                    width: 1,
                    style: 3,
                    labelBackgroundColor: '#9945FF',
                },
                horzLine: {
                    color: 'rgba(153, 69, 255, 0.5)',
                    width: 1,
                    style: 3,
                    labelBackgroundColor: '#9945FF',
                },
            },
        });

        const series = chart.addSeries(AreaSeries, {
            lineColor: lineColor,
            topColor: topColor,
            bottomColor: bottomColor,
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });

        const chartData = data.map(d => ({
            time: d.timestamp / 1000 as any,
            value: isYes ? d.yesPrice * 100 : d.noPrice * 100,
        }));

        series.setData(chartData);
        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, outcome, lineColor, topColor, bottomColor, isYes]);

    return (
        <div className="w-full relative h-[400px]" ref={chartContainerRef} />
    );
}

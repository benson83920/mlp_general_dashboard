"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
} from "lightweight-charts";
import axios from "axios";

export default function PriceKLineChart(props) {
    const { timeScale } = props; // 例如 "1m", "5m" 等
    const chartContainerRef = useRef(null);
    const [chart, setChart] = useState(null);
    const [series, setSeries] = useState(null);
    const [volumeSeries, setVolumeSeries] = useState(null);
    // 儲存歷史資料與更新後的所有資料
    const [chartData, setChartData] = useState([]);
    // 儲存 WS 回傳的當前時間區間資料
    const [lastIntervalData, setLastIntervalData] = useState([]);

    // 轉換 WS 回傳資料格式
    const transformWSData = (data) => ({
        time: parseInt(data.t),
        open: parseFloat(data.o),
        high: parseFloat(data.h),
        low: parseFloat(data.l),
        close: parseFloat(data.c),
        value: isNaN(parseFloat(data.v)) ? 0 : parseFloat(data.v),
    });

    // 透過 REST API 取得歷史 K 線資料
    useEffect(() => {
        const fetchHistoricalData = async () => {
            try {
                const url = `/api/getKlineData/${timeScale}`;
                const response = await axios.get(url);
                const formattedData = response.data.map((item) => ({
                    time: parseInt(item[0]),
                    open: parseFloat(item[5]),
                    high: parseFloat(item[3]),
                    low: parseFloat(item[4]),
                    close: parseFloat(item[2]),
                    value: isNaN(parseFloat(item[1])) ? 0 : parseFloat(item[1]),
                }));
                setChartData(formattedData);
            } catch (error) {
                console.error("取得歷史資料失敗:", error);
            }
        };

        fetchHistoricalData();
    }, [timeScale]);

    // 建立 WS 連線，並在收到更新資料時呼叫 updateLastIntervalData
    useEffect(() => {
        let socket;
        const connect = () => {
            socket = new WebSocket("wss://api.gateio.ws/ws/v4/");

            socket.addEventListener("open", () => {
                const subscribeMessage = JSON.stringify({
                    time: Math.floor(Date.now() / 1000),
                    channel: "spot.candlesticks",
                    event: "subscribe",
                    payload: [timeScale, "MLP_USDT"],
                });
                socket.send(subscribeMessage);
            });

            socket.addEventListener("message", (event) => {
                const message = JSON.parse(event.data);
                if (
                    message.channel === "spot.candlesticks" &&
                    message.event === "update" &&
                    message.result
                ) {
                    // 轉換 WS 資料格式
                    const wsData = transformWSData(message.result);
                    // 模仿方式：根據目前區間更新 lastIntervalData
                    updateLastIntervalData(wsData);
                }
            });

            socket.addEventListener("error", (event) => {
                console.error("WebSocket error:", event);
            });

            socket.addEventListener("close", (event) => {
                console.warn("WebSocket closed:", event);
                setTimeout(connect, 500);
            });
        };

        connect();

        return () => {
            if (socket) socket.close();
        };
    }, [timeScale]);

    // 根據 timeScale 更新當前區間的資料
    const updateLastIntervalData = (newData) => {
        setLastIntervalData((prevData) => {
            // 假設 timeScale 為 "1m", "5m" 等，先取得數字部分 (分鐘)
            const timeScaleInSeconds = parseInt(timeScale) * 60;
            const currentTime = Math.floor(Date.now() / 1000);
            const currentIntervalStart =
                Math.floor(currentTime / timeScaleInSeconds) *
                timeScaleInSeconds;

            // 過濾出屬於當前區間的資料
            const filteredPrev = prevData.filter(
                (item) => item.time >= currentIntervalStart
            );
            // 新資料加入後仍需過濾屬於當前區間的資料
            const updated = [...filteredPrev, newData].filter(
                (item) => item.time >= currentIntervalStart
            );
            updated.sort((a, b) => a.time - b.time);
            return updated;
        });
    };

    // 根據 lastIntervalData 更新 chartData（若有當前區間資料則更新，否則新增新的 candle）
    useEffect(() => {
        if (!series || !volumeSeries || lastIntervalData.length === 0) return;

        // 計算當前區間起始時間
        const timeScaleInSeconds = parseInt(timeScale) * 60;
        const currentIntervalStart =
            Math.floor(Date.now() / 1000 / timeScaleInSeconds) *
            timeScaleInSeconds;

        // 取當前區間最新的一筆資料
        const latestData = lastIntervalData[lastIntervalData.length - 1];

        // 更新 chartData：檢查最後一筆是否屬於當前區間
        setChartData((prevChartData) => {
            let updatedChartData = [...prevChartData];
            const lastCandle = updatedChartData[updatedChartData.length - 1];

            if (lastCandle && lastCandle.time === currentIntervalStart) {
                // 更新現有的 candle（您可以根據實際需求調整更新邏輯）
                const updatedCandle = {
                    ...lastCandle,
                    open: latestData.open,
                    high: Math.max(lastCandle.high, latestData.high),
                    low: Math.min(lastCandle.low, latestData.low),
                    close: latestData.close,
                    value: latestData.value,
                };
                updatedChartData[updatedChartData.length - 1] = updatedCandle;
            } else {
                // 新增新的 candle
                updatedChartData.push({
                    time: currentIntervalStart,
                    open: latestData.open,
                    high: latestData.high,
                    low: latestData.low,
                    close: latestData.close,
                    value: latestData.value,
                });
            }
            return updatedChartData;
        });
    }, [lastIntervalData, series, volumeSeries, timeScale]);

    // 建立圖表及系列
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chartOptions = {
            layout: {
                textColor: "white",
                background: { type: "solid", color: "black" },
            },
            grid: {
                vertLines: { color: "#404040" },
                horzLines: { color: "#404040" },
            },
            height: 600,
            timeScale: {
                tickMarkFormatter: (time) => {
                    const date = new Date(time * 1000);
                    const hours = date.getHours().toString().padStart(2, "0");
                    const minutes = date
                        .getMinutes()
                        .toString()
                        .padStart(2, "0");
                    return `${hours}:${minutes}`;
                },
                timeVisible: false,
                secondsVisible: false,
            },
        };

        const chartInstance = createChart(
            chartContainerRef.current,
            chartOptions
        );
        setChart(chartInstance);

        chartInstance.applyOptions({
            localization: {
                locale: "zh-TW",
                timeZone: "Asia/Taipei",
                timeFormatter: (time) => {
                    const date = new Date(time * 1000);
                    const year = date.getFullYear();
                    const month = (date.getMonth() + 1)
                        .toString()
                        .padStart(2, "0");
                    const day = date.getDate().toString().padStart(2, "0");
                    const hours = date.getHours().toString().padStart(2, "0");
                    const minutes = date
                        .getMinutes()
                        .toString()
                        .padStart(2, "0");
                    return `${year}/${month}/${day} ${hours}:${minutes}`;
                },
            },
        });

        const candlestickSeries = chartInstance.addSeries(CandlestickSeries, {
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderVisible: true,
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
            priceFormat: { type: "price", precision: 5, minMove: 0.00001 },
        });
        candlestickSeries.priceScale().applyOptions({
            scaleMargins: { top: 0, bottom: 0.1 },
        });
        setSeries(candlestickSeries);

        const volumeHistogramSeries = chartInstance.addSeries(HistogramSeries, {
            color: "#26a69a",
            priceFormat: { type: "volume" },
            priceScaleId: "",
            scaleMargins: { top: 0.9, bottom: 0 },
            crossHairMarker: {
                color: "#00f",
                borderWidth: 1,
                borderColor: "#fff",
                background: "rgba(0,0,0,0.8)",
                textColor: "#fff",
            },
        });
        volumeHistogramSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        setVolumeSeries(volumeHistogramSeries);

        const container = chartContainerRef.current;
        const legend = document.createElement("div");
        legend.style = `
          position: absolute;
          left: 12px;
          top: 12px;
          z-index: 1;
          font-size: 14px;
          font-family: sans-serif;
          line-height: 18px;
          font-weight: 300;
          color: white;
        `;
        container.appendChild(legend);

        const firstRow = document.createElement("div");
        firstRow.style.color = "white";
        legend.appendChild(firstRow);

        chartInstance.subscribeCrosshairMove((param) => {
            if (param.seriesData) {
                const candleData = param.seriesData.get(candlestickSeries);
                const volumeData = param.seriesData.get(volumeHistogramSeries);
                const priceInfo =
                    candleData && volumeData
                        ? `MLP_USDT ${timeScale} 開=${candleData.open} 高=${candleData.high} 低=${candleData.low} 收=${candleData.close} 成交量=${volumeData.value}`
                        : "";
                firstRow.innerHTML = priceInfo;
            } else {
                firstRow.innerHTML = "";
            }
        });

        return () => {
            chartInstance.remove();
        };
    }, [timeScale]);

    useEffect(() => {
        if (!series || !volumeSeries || chartData.length === 0) return;

        // 格式化資料，支援歷史資料與 WS 傳回的陣列格式
        const formatData = (data) =>
            data.map((d) => {
                if (typeof d === "object" && d.time !== undefined) {
                    return d;
                }
                return {
                    time: parseInt(d[0]),
                    open: parseFloat(d[5]),
                    high: parseFloat(d[3]),
                    low: parseFloat(d[4]),
                    close: parseFloat(d[2]),
                    value: isNaN(parseFloat(d[1])) ? 0 : parseFloat(d[1]),
                };
            });

        const formattedData = formatData(chartData);
        // 為成交量圖表資料新增 color 屬性
        const volumeData = formattedData.map((d) => ({
            ...d,
            color: d.close >= d.open ? "#26a69a" : "#ef5350",
        }));

        // 若資料筆數大於 100 則重設所有資料；否則更新最新資料
        if (formattedData.length >= 100) {
            series.setData(formattedData);
            volumeSeries.setData(volumeData);
        } else {
            const lastTime = formattedData[formattedData.length - 1]?.time;
            const newCandleData = formattedData.filter(
                (d) => d.time === lastTime
            );
            const newVolumeData = volumeData.filter((d) => d.time === lastTime);
            newCandleData.forEach((d) => series.update(d));
            newVolumeData.forEach((d) => volumeSeries.update(d));
        }
    }, [chartData, series, volumeSeries]);

    return (
        <div className="flex flex-col justify-center mt-1 relative">
            <div className="text-center font-medium text-2xl mb-1">
                {timeScale} K線圖
            </div>
            <div
                ref={chartContainerRef}
                style={{ width: "100%", position: "relative", height: "80%" }}
                className="border-2 border-gray-400"
            />
        </div>
    );
}

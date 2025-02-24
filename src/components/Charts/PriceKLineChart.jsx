"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
} from "lightweight-charts";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function PriceKLineChart(props) {
    const { timeScale } = props; // 例如 "1m", "5m", "4h", "1d" 等
    const chartContainerRef = useRef(null);
    const [chart, setChart] = useState(null);
    const [series, setSeries] = useState(null);
    const [volumeSeries, setVolumeSeries] = useState(null);
    const [mlpDiffHistogramSeries, setMLPDiffHistogramSeries] = useState(null);
    // 儲存歷史資料與更新後的所有資料
    const [chartData, setChartData] = useState([]);
    // 儲存 WS 回傳的當前時間區間資料
    const [lastIntervalData, setLastIntervalData] = useState([]);
    const [mlpDiffData, setMLPDiffData] = useState([]);

    // 轉換 WS 回傳資料格式
    const transformWSData = (data) => ({
        time: parseInt(data.t),
        open: parseFloat(data.o),
        high: parseFloat(data.h),
        low: parseFloat(data.l),
        close: parseFloat(data.c),
        value: isNaN(parseFloat(data.v)) ? 0 : parseFloat(data.v),
    });

    useEffect(() => {
        const fetchHistoricalMLPDiffData = async () => {
            try {
                const url = "/api/getHistoricalMLPDiffData";
                const response = await axios.get(url);
                let data = response.data.data;

                data = data.map((item) => ({
                    ...item,
                    timestamp: dayjs
                        .tz(item.timestamp, "America/Toronto") // 原本是多倫多時間
                        .tz("Asia/Taipei") // 轉換成台北時間
                        .format("YYYY-MM-DD HH:mm:ss"),
                }));

                setMLPDiffData(data);
            } catch (error) {
                console.error("取得 MLP Diff Data 失敗:", error);
            }
        };

        fetchHistoricalMLPDiffData();
    }, []);

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
                    const wsData = transformWSData(message.result);
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
            const timeScaleInSeconds = parseInt(timeScale) * 60;
            const currentTime = Math.floor(Date.now() / 1000);
            const currentIntervalStart =
                Math.floor(currentTime / timeScaleInSeconds) *
                timeScaleInSeconds;
            const filteredPrev = prevData.filter(
                (item) => item.time >= currentIntervalStart
            );
            const updated = [...filteredPrev, newData].filter(
                (item) => item.time >= currentIntervalStart
            );
            updated.sort((a, b) => a.time - b.time);
            return updated;
        });
    };

    // 建立圖表及各系列
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

        // candlestickSeries：上部 70%
        const candlestickSeries = chartInstance.addSeries(CandlestickSeries, {
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderVisible: true,
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
            priceFormat: { type: "price", precision: 5, minMove: 0.00001 },
        });
        // 透過設定 bottom margin 為 0.3，使 K 線圖繪圖區佔 70%
        candlestickSeries.priceScale().applyOptions({
            scaleMargins: { top: 0, bottom: 0.3 },
        });
        setSeries(candlestickSeries);

        // 如果 timeScale 不是 "4h" 或 "1d"，才建立 mlpDiffHistogramSeries
        let mlpDiffSeries = null;
        if (timeScale !== "4h" && timeScale !== "1d") {
            mlpDiffSeries = chartInstance.addSeries(HistogramSeries, {
                color: "#26a69a",
                priceFormat: { type: "volume" },
                priceScaleId: "mlpDiff",
            });
            // 設定 mlpDiff 繪圖區：上方留 70%，下方留 10%（繪圖區 20%）
            chartInstance.priceScale("mlpDiff").applyOptions({
                scaleMargins: { top: 0.7, bottom: 0.1 },
            });
            setMLPDiffHistogramSeries(mlpDiffSeries);
        } else {
            setMLPDiffHistogramSeries(null);
        }

        // volumeHistogramSeries：底部 10%
        const volumeHistSeries = chartInstance.addSeries(HistogramSeries, {
            color: "#26a69a",
            priceFormat: { type: "volume" },
            priceScaleId: "volume",
            crossHairMarker: {
                color: "#00f",
                borderWidth: 1,
                borderColor: "#fff",
                background: "rgba(0,0,0,0.8)",
                textColor: "#fff",
            },
        });
        chartInstance.priceScale("volume").applyOptions({
            scaleMargins: { top: 0.9, bottom: 0 },
        });
        setVolumeSeries(volumeHistSeries);

        // 建立 legend 顯示資料
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
                const volumeData = param.seriesData.get(volumeHistSeries);
                let priceInfo =
                    candleData && volumeData
                        ? `MLP_USDT ${timeScale} 開=${candleData.open} 高=${candleData.high} 低=${candleData.low} 收=${candleData.close} 成交量=${volumeData.value}`
                        : "";
                // 如果 mlpDiffSeries 有建立，就加入 MLP Diff 資訊
                if (mlpDiffSeries) {
                    const mlpDiffData = param.seriesData.get(mlpDiffSeries);
                    if (mlpDiffData) {
                        const diff = mlpDiffData.value;
                        if (diff >= 0) {
                            priceInfo += ` <span style="color: #26a69a;">MLP流入 ${diff.toFixed(
                                2
                            )}</span>`;
                        } else {
                            priceInfo += ` <span style="color: #ef5350;">MLP流出 ${diff.toFixed(
                                2
                            )}</span>`;
                        }
                    }
                }
                firstRow.innerHTML = priceInfo;
            } else {
                firstRow.innerHTML = "";
            }
        });

        return () => {
            chartInstance.remove();
        };
    }, [timeScale]);

    // 更新 mlpDiff 資料
    useEffect(() => {
        if (!chart || !mlpDiffHistogramSeries || mlpDiffData.length === 0)
            return;
        const formattedMLPDiffData = mlpDiffData
            .map((item) => {
                const timeInSeconds = Math.floor(
                    new Date(item.timestamp).getTime() / 1000
                );
                const diff = parseFloat(item.tokenAmountDiff);
                return {
                    time: timeInSeconds,
                    value: diff,
                    color: diff >= 0 ? "#26a69a" : "#ef5350",
                };
            })
            .sort((a, b) => a.time - b.time);
        mlpDiffHistogramSeries.setData(formattedMLPDiffData);
    }, [chart, mlpDiffHistogramSeries, mlpDiffData]);

    // 更新 candlestick 與 volume 資料
    useEffect(() => {
        if (!series || !volumeSeries || chartData.length === 0) return;
        const formatData = (data) =>
            data.map((d) => {
                if (typeof d === "object" && d.time !== undefined) return d;
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
        const volumeData = formattedData.map((d) => ({
            ...d,
            color: d.close >= d.open ? "#26a69a" : "#ef5350",
        }));
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
                style={{ width: "100%", position: "relative", height: "100%" }}
                className="border-2 border-gray-400"
            />
        </div>
    );
}

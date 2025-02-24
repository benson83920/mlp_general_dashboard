"use client";

import { useEffect, useState, useRef } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import axios from "axios";

export default function BuyAndSellAveragePrice(props) {
    const { timeScale } = props;

    const chartContainerRef = useRef(null);
    const [chart, setChart] = useState(null);
    const [buySeries, setBuySeries] = useState(null);
    const [sellSeries, setSellSeries] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [lastMinuteData, setLastMinuteData] = useState([]);
    const [isFirstDataReceived, setIsFirstDataReceived] = useState(false);

    useEffect(() => {
        let socket;
        const connect = () => {
            socket = new WebSocket("wss://api.gateio.ws/ws/v4/");

            socket.addEventListener("open", () => {
                const subscribeMessage = JSON.stringify({
                    time: Math.floor(Date.now() / 1000),
                    channel: "spot.trades",
                    event: "subscribe",
                    payload: ["MLP_USDT"],
                });
                socket.send(subscribeMessage);
            });

            socket.addEventListener("message", (event) => {
                const message = JSON.parse(event.data);
                if (
                    message.channel === "spot.trades" &&
                    message.event === "update" &&
                    message.result
                ) {
                    updateLastTimeScaleData(message.result);
                }
            });

            socket.addEventListener("error", (event) => {
                console.error("WebSocket error: ", event);
            });

            socket.addEventListener("close", (event) => {
                console.warn("WebSocket closed: ", event);
                setTimeout(connect, 500);
            });
        };

        connect();

        return () => {
            if (socket) socket.close();
        };
    }, []);

    useEffect(() => {
        const fetchHistoricalData = async () => {
            try {
                const url = `/api/getPublicTradeData`;
                const response = await axios.get(url);
                // 將每筆資料轉換：
                // 使用 create_time_ms (毫秒) 作為 ts，
                // side 為 "buy" 或 "sell"，price 轉為數字
                const formattedData = response.data.map((item) => ({
                    ts: parseFloat(item.create_time_ms), // 毫秒時間戳
                    side: item.side,
                    price: parseFloat(item.price),
                }));
                setChartData(formattedData);
            } catch (error) {
                console.error("取得歷史資料失敗:", error);
            }
        };

        fetchHistoricalData();
    }, [timeScale]);

    // 紀錄最後timeScale的所有資料
    const updateLastTimeScaleData = (newData) => {
        setLastMinuteData((prevData) => {
            const currentTime = Date.now(); // 當前時間，毫秒
            const timeScaleInMs = parseInt(timeScale) * 60 * 1000; // 將 timeScale 轉換為毫秒
            const currentIntervalStart =
                Math.floor(currentTime / timeScaleInMs) * timeScaleInMs;

            // 過濾出先前屬於當前區間的資料
            const filteredPrevData = prevData.filter(
                (item) => item.ts >= currentIntervalStart
            );

            // 將新的資料物件轉換成統一格式
            const newFormatted = {
                ts: parseFloat(newData.create_time_ms), // 以毫秒為單位
                side: newData.side,
                price: parseFloat(newData.price),
            };

            // 合併並過濾屬於當前區間的資料 (currentIntervalStart ~ currentTime)
            const updatedData = [...filteredPrevData, newFormatted].filter(
                (item) =>
                    item.ts >= currentIntervalStart && item.ts <= currentTime
            );

            updatedData.sort((a, b) => a.ts - b.ts);
            return updatedData;
        });
    };

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chartOptions = {
            rightPriceScale: {
                alignLabels: false,
                scaleMargins: {
                    top: 0.3,
                    bottom: 0.3,
                },
            },
            layout: {
                textColor: "white",
                background: { type: "solid", color: "black" },
            },
            grid: {
                vertLines: {
                    color: "#404040",
                },
                horzLines: {
                    color: "#404040",
                },
            },
            crosshair: {
                mode: 0,
            },
            height: 600,
            timeScale: {
                rightOffset: 3,
                tickMarkFormatter: (time, tickMarkType, locale) => {
                    const date = new Date(time * 1000);
                    const taiwanTime = new Date(date.getTime());
                    const hours = taiwanTime
                        .getHours()
                        .toString()
                        .padStart(2, "0");
                    const minutes = taiwanTime
                        .getMinutes()
                        .toString()
                        .padStart(2, "0");
                    return `${hours}:${minutes}`;
                },
                timeVisible: false,
                secondsVisible: false,
            },
        };

        const chart = createChart(chartContainerRef.current, chartOptions);
        setChart(chart);

        chart.applyOptions({
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

        const buyLineSeries = chart.addSeries(LineSeries, {
            color: "#26a69a",
            lineWidth: 2,
            priceFormat: {
                type: "price",
                precision: 5,
                minMove: 0.00001,
            },
        });

        const sellLineSeries = chart.addSeries(LineSeries, {
            color: "#ef5350",
            lineWidth: 2,
            priceFormat: {
                type: "price",
                precision: 5,
                minMove: 0.00001,
            },
        });
        buyLineSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0,
                bottom: 0,
            },
        });
        sellLineSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0,
                bottom: 0,
            },
        });
        setBuySeries(buyLineSeries);
        setSellSeries(sellLineSeries);

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

        chart.subscribeCrosshairMove((param) => {
            if (param.seriesData && param.seriesData.size > 0) {
                const buySeriesData = param.seriesData.get(buyLineSeries);
                const sellSeriesData = param.seriesData.get(sellLineSeries);

                let priceInfo = "";

                if (buySeriesData) {
                    priceInfo += `<div style="color:#26a69a">買入均價＝${buySeriesData.value.toFixed(
                        5
                    )}</div>`;
                }

                if (sellSeriesData) {
                    priceInfo += `<div style="color:#ef5350">賣出均價＝${sellSeriesData.value.toFixed(
                        5
                    )}</div>`;
                }

                firstRow.innerHTML = priceInfo;
            } else {
                firstRow.innerHTML = "";
            }
        });

        chart.timeScale().fitContent();

        return () => {
            chart.remove();
        };
    }, [timeScale]);

    useEffect(() => {
        if (!buySeries || !sellSeries || chartData.length === 0) return;

        const resultBuyData = processLineData(chartData, "buy");
        const resultSellData = processLineData(chartData, "sell");

        if (!isFirstDataReceived) {
            buySeries.setData(resultBuyData);
            sellSeries.setData(resultSellData);
            setIsFirstDataReceived(true);
        }
    }, [buySeries, sellSeries, chartData, isFirstDataReceived, timeScale]);

    useEffect(() => {
        if (!lastMinuteData.length || !isFirstDataReceived) return;

        const resultBuyData = processLineData(lastMinuteData, "buy");
        resultBuyData.forEach((buyData) => {
            buySeries.update(buyData);
        });

        const resultSellData = processLineData(lastMinuteData, "sell");
        resultSellData.forEach((sellData) => {
            sellSeries.update(sellData);
        });
    }, [lastMinuteData, sellSeries, buySeries, isFirstDataReceived, timeScale]);

    // 將所有chartData按照buy和sell以及timeScale來計算時匡內的平均價格
    const processLineData = (data, side) => {
        const timeScaleInSeconds = parseInt(timeScale) * 60;
        const filteredData = data
            .filter((item) => item.side === side)
            .map((item) => ({
                time: Math.floor(parseFloat(item.ts) / 1000),
                value: parseFloat(item.price),
            }))
            .sort((a, b) => a.time - b.time);

        if (filteredData.length === 0) {
            return [];
        }

        const averagedData = [];
        let currentIntervalStart =
            Math.floor(filteredData[0].time / timeScaleInSeconds) *
            timeScaleInSeconds;
        let sum = 0;
        let count = 0;

        filteredData.forEach((item) => {
            const itemIntervalStart =
                Math.floor(item.time / timeScaleInSeconds) * timeScaleInSeconds;

            if (itemIntervalStart !== currentIntervalStart) {
                averagedData.push({
                    time: currentIntervalStart,
                    value: sum / count,
                });
                currentIntervalStart = itemIntervalStart;
                sum = item.value;
                count = 1;
            } else {
                sum += item.value;
                count++;
            }
        });

        // Push the last group if there's remaining data
        if (count > 0) {
            averagedData.push({
                time: currentIntervalStart,
                value: sum / count,
            });
        }

        return averagedData;
    };

    return (
        <div className="flex flex-col justify-center mt-1 ml-2 relative">
            <div className="text-center font-medium text-2xl mb-1 mt-3 text-white">
                買賣均價折線圖
            </div>
            <div
                ref={chartContainerRef}
                style={{ width: "100%", position: "relative" }}
                className="border-2 border-gray-400"
            />
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import Histogram from "highcharts/modules/histogram-bellcurve";
import HighchartsTheme from "highcharts/themes/brand-dark";
import axios from "axios";
import { Empty, Spin } from "antd";
import { DateTime } from "luxon";

if (typeof Highcharts === "object") {
    // 初始化Histogram模組
    Histogram(Highcharts);

    // 應用brand dark主題
    HighchartsTheme(Highcharts);
}

export default function DeltaChart(props) {
    const { timeScale } = props;

    const [delta, setDelta] = useState([]);
    const [isDeltaLoading, setIsDeltaLoading] = useState(true);

    useEffect(() => {
        if (timeScale === "1m") return;
        axios
            .get(`/api/getDeltaData/${timeScale.toLowerCase()}`)
            .then((res) => {
                // 將 deltaData 轉換成 [timestamp, delta, originalTimeString] 格式的資料
                const formattedData =
                    res.data.map((item) => [
                        DateTime.fromISO(item.timestamp, { zone: "utc" }).ts,

                        item.delta,
                        // DateTime.fromMillis(new Date(item.timestamp).getTime())
                        //     .setZone("Asia/Taipei")
                        //     .toFormat("yyyy-MM-dd HH:mm:ss"), // 原始時間字符串
                    ]) || [];
                setDelta(formattedData);
                setIsDeltaLoading(false);
            })
            .catch((e) => {
                console.log(e);
            });
    }, [timeScale]);

    const options = {
        chart: {
            zoomType: "x", // 啟用X軸縮放和平移
        },
        title: { text: "Delta Histogram" },
        xAxis: [
            {
                type: "datetime", // 將 x 軸設定為時間軸
                title: { text: "Taipei Time" },
                alignTicks: false,
                zoomEnabled: true,
                labels: {
                    rotation: -45, // 如果標籤過長，可旋轉以防重疊
                },
            },
        ],
        yAxis: [{ title: { text: "Delta" } }],
        plotOptions: {
            histogram: {
                zones: [
                    {
                        value: 0,
                        color: "#ef5350", // 負值顏色
                    },
                    {
                        color: "#26a69a", // 正值顏色
                    },
                ],
            },
        },
        // 提示匡設置
        tooltip: {
            formatter: function () {
                // 使用 this.point.x 來取得時間戳
                const timestamp = this.point.x;
                // console.log(timestamp);
                const taipeiFormattedTime = DateTime.fromMillis(timestamp)
                    .setZone("Asia/Taipei")
                    .toFormat("yyyy-MM-dd HH:mm:ss");

                const torontoFormattedTime = DateTime.fromMillis(timestamp)
                    .setZone("America/Toronto")
                    .toFormat("yyyy-MM-dd HH:mm:ss");

                return `<b>Taipei Time:</b> ${taipeiFormattedTime}
                        <br><b>Toronto Time:</b> ${torontoFormattedTime}
                        <br><b>Delta:</b> ${this.point.y}`;
            },
        },
        time: {
            timezone: "Asia/Taipei", // x軸的時區
        },
        series: [
            {
                name: "Delta",
                type: "histogram",
                data: delta, // 使用轉換後的資料
                zIndex: -1,
            },
        ],
    };

    return (
        <div className="ml-3 mr-4 mt-4">
            {timeScale === "1m" ? (
                <>
                    <div className="text-center text-2xl mb-2">
                        Delta Histogram
                    </div>
                    <Empty description="不支援1m資料" />
                </>
            ) : (
                <Spin spinning={isDeltaLoading}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={options}
                    />
                </Spin>
            )}
        </div>
    );
}

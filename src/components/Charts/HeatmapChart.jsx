"use client";

import { useEffect, useState } from "react";
import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import HighchartsTheme from "highcharts/themes/brand-dark";
import HighChartsHeatmap from "highcharts/modules/heatmap";
import axios from "axios";

if (typeof Highcharts === "object") {
    // 應用brand dark主題
    HighchartsTheme(Highcharts);
}

export default function HeatmapChart() {
    const [candleData, setCandleData] = useState([]);

    useEffect(() => {
        axios
            .get("https://demo-live-data.highcharts.com/aapl-ohlc.json")
            .then((res) => setCandleData(res.data))
            .catch((error) => console.log(error));
    }, [candleData]);

    const options = {
        chart: {
            zoomType: "x", // 啟用X軸縮放和平移
        },
        rangeSelector: {
            selected: 1,
        },

        title: {
            text: "AAPL Stock Price",
        },

        series: [
            {
                type: "candlestick",
                name: "AAPL Stock Price",
                data: candleData,
                dataGrouping: {
                    units: [
                        [
                            "week", // unit name
                            [1], // allowed multiples
                        ],
                        ["month", [1, 2, 3, 4, 6]],
                    ],
                },
            },
        ],
    };

    return (
        <div className="ml-4 mr-4 mt-4">
            <HighchartsReact highcharts={Highcharts} options={options} />
        </div>
    );
}

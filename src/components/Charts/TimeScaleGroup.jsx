"use client";

import { Tabs, theme } from "antd";
import AllCharts from "./AllCharts";
import StickyBox from "react-sticky-box";

export default function TimeScaleGroup() {
    const items = [
        {
            key: "1m",
            label: "1m",
            children: <AllCharts timeScale={"1m"} />,
        },
        {
            key: "5m",
            label: "5m",
            children: <AllCharts timeScale={"5m"} />,
        },
        {
            key: "15m",
            label: "15m",
            children: <AllCharts timeScale={"15m"} />,
        },
        {
            key: "1H",
            label: "1H",
            children: <AllCharts timeScale={"1h"} />,
        },
        {
            key: "4H",
            label: "4H",
            children: <AllCharts timeScale={"4h"} />,
        },
        {
            key: "1D",
            label: "1D",
            children: <AllCharts timeScale={"1d"} />,
        },
    ];

    const {
        token: { colorBgContainer },
    } = theme.useToken();
    const renderTabBar = (props, DefaultTabBar) => (
        <StickyBox
            offsetTop={0}
            offsetBottom={20}
            style={{
                zIndex: 5,
            }}
        >
            <DefaultTabBar
                {...props}
                style={{
                    background: colorBgContainer,
                }}
            />
        </StickyBox>
    );

    return (
        <Tabs
            defaultActiveKey="1m"
            items={items}
            style={{
                marginLeft: "12px",
                marginRight: "12px",
            }}
            renderTabBar={renderTabBar}
        />
    );
}

import { NextResponse } from "next/server";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const getFormattedDate = (daysAgo = 0) => {
    // 取得當前時間並設定為多倫多時區
    let now = dayjs().tz("America/Toronto");

    // 減去指定天數，並設定分鐘、秒、毫秒為 0
    now = now.subtract(daysAgo, "day").startOf("hour");

    return now.format("YYYY-MM-DD HH:00:00");
};

export const GET = async () => {
    const endTime = getFormattedDate(0); // 當前時間（到小時）
    const startTime = getFormattedDate(60); // 60 天前（到小時）

    const baseUrl = "http://15.223.56.47:3001/balance/gate/history";
    const url = `${baseUrl}?endTime=${encodeURIComponent(
        endTime
    )}&startTime=${encodeURIComponent(startTime)}`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
    }
};

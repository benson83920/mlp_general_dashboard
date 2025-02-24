import { NextResponse } from "next/server";
import axios from "axios";

export const GET = async () => {
    const url = `https://api.gateio.ws/api/v4/spot/trades?currency_pair=MLP_USDT&limit=1000`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
    }
};

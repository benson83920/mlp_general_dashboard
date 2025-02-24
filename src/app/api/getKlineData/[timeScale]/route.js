import { NextResponse } from "next/server";
import axios from "axios";

export const GET = async (_, { params }) => {
    const { timeScale } = params;

    const url = `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=MLP_USDT&interval=${timeScale}&limit=1000`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
    }
};

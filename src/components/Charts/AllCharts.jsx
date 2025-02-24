import PriceKLineChart from "./PriceKLineChart";
import BuyAndSellAveragePrice from "./BuyAndSellAveragePrice";
// import DeltaChart from "./DeltaChart";
// import HeatmapChart from "./HeatmapChart";

export default function AllCharts(props) {
    const { timeScale } = props;
    return (
        <>
            <PriceKLineChart timeScale={timeScale} />
            <BuyAndSellAveragePrice timeScale={timeScale} />
            {/* <DeltaChart timeScale={timeScale} />
            <HeatmapChart timeScale={timeScale} /> */}
        </>
    );
}

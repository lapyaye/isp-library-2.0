import { AnalyticsCharts } from "@/components/analytics-charts"
import { getEbooks } from "@/lib/ebooks";

export default async function AnalyticsPage() {
  let ebooksCount = 0;
  try{
    const ebooks = await getEbooks();
    ebooksCount = ebooks.length;
  }catch(err){
    console.error("[analytics] failed to load analytics data:", err)
  }
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Library Analytics</h1>
        <p className="text-muted-foreground text-base">Visualizing our collection growth and diversity</p>
      </div>

      <AnalyticsCharts ebooksCount={ebooksCount} />
    </div>
  )
}


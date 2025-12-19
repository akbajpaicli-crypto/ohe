"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapContainer } from "@/components/map-container"
import { Activity, MapPin, AlertCircle, TrendingUp } from "lucide-react"

interface AnalysisResultsProps {
  data: {
    summary: {
      total_ohe_structures: number
      matched_structures: number
      unmatched_structures: number
      match_rate: number
      avg_speed: number
      max_speed: number
      min_speed: number
    }
    results: Array<{
      OHEMas: string
      latitude: number
      longitude: number
      logging_time: string
      speed_kmph: number | null
      matched: boolean
    }>
  }
}

export function AnalysisResults({ data }: AnalysisResultsProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [speedFilter, setSpeedFilter] = useState<"all" | "matched" | "unmatched">("all")

  const filteredResults = useMemo(() => {
    return data.results.filter((item) => {
      const matchesSearch = item.OHEMas.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter =
        speedFilter === "all" ||
        (speedFilter === "matched" && item.matched) ||
        (speedFilter === "unmatched" && !item.matched)
      return matchesSearch && matchesFilter
    })
  }, [data.results, searchTerm, speedFilter])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Structures</p>
              <p className="text-2xl font-bold">{data.summary.total_ohe_structures}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
              <Activity className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Match Rate</p>
              <p className="text-2xl font-bold">{data.summary.match_rate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
              <TrendingUp className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Speed</p>
              <p className="text-2xl font-bold">{data.summary.avg_speed.toFixed(0)} km/h</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unmatched</p>
              <p className="text-2xl font-bold">{data.summary.unmatched_structures}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Map */}
      <Card className="overflow-hidden p-0">
        <MapContainer data={data.results} />
      </Card>

      {/* Data Table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Detailed Results</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSpeedFilter("all")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                speedFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSpeedFilter("matched")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                speedFilter === "matched"
                  ? "bg-chart-4 text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Matched
            </button>
            <button
              onClick={() => setSpeedFilter("unmatched")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                speedFilter === "unmatched"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Unmatched
            </button>
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="search" className="sr-only">
            Search structures
          </Label>
          <Input
            id="search"
            placeholder="Search by OHE structure name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-left font-medium text-muted-foreground">OHE Structure</th>
                <th className="pb-3 text-left font-medium text-muted-foreground">Latitude</th>
                <th className="pb-3 text-left font-medium text-muted-foreground">Longitude</th>
                <th className="pb-3 text-left font-medium text-muted-foreground">Timestamp</th>
                <th className="pb-3 text-right font-medium text-muted-foreground">Speed (km/h)</th>
                <th className="pb-3 text-center font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((item, index) => (
                <tr key={index} className="border-b border-border last:border-0">
                  <td className="py-3 font-medium">{item.OHEMas}</td>
                  <td className="py-3 text-muted-foreground">{item.latitude.toFixed(6)}</td>
                  <td className="py-3 text-muted-foreground">{item.longitude.toFixed(6)}</td>
                  <td className="py-3 text-muted-foreground">{item.logging_time || "—"}</td>
                  <td className="py-3 text-right font-semibold">
                    {item.speed_kmph !== null ? item.speed_kmph.toFixed(1) : "—"}
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        item.matched ? "bg-chart-4/10 text-chart-4" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {item.matched ? "Matched" : "Unmatched"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredResults.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">No results found</div>
          )}
        </div>
      </Card>
    </div>
  )
}

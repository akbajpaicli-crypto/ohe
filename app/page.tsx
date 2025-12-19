"use client"

import type React from "react"

import { useState } from "react"
import { Upload, MapPin, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AnalysisResults } from "@/components/analysis-results"
import { analyzeData } from "@/lib/analyzer"

export default function Home() {
  const [rtisFile, setRtisFile] = useState<File | null>(null)
  const [oheFile, setOheFile] = useState<File | null>(null)
  const [maxDistance, setMaxDistance] = useState<number>(50)
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<{ type: "idle" | "processing" | "success" | "error"; message: string }>({
    type: "idle",
    message: "Ready for Analysis",
  })
  const [results, setResults] = useState<any>(null)

  const handleRtisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (ext === "csv" || ext === "xlsx") {
        setRtisFile(file)
        setStatus({ type: "idle", message: "RTIS file uploaded" })
      } else {
        setStatus({ type: "error", message: "Error: Invalid file format. Please upload CSV or Excel file." })
      }
    }
  }

  const handleOheUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (ext === "csv" || ext === "xlsx") {
        setOheFile(file)
        setStatus({ type: "idle", message: "OHE file uploaded" })
      } else {
        setStatus({ type: "error", message: "Error: Invalid file format. Please upload CSV or Excel file." })
      }
    }
  }

  const handleAnalyze = async () => {
    if (!rtisFile || !oheFile) {
      setStatus({ type: "error", message: "Error: Both files are required" })
      return
    }

    setIsProcessing(true)
    setStatus({ type: "processing", message: "Processing..." })

    try {
      const data = await analyzeData(rtisFile, oheFile, maxDistance)

      setResults(data)
      setStatus({ type: "success", message: "Success! Analysis complete." })
    } catch (error) {
      console.error("Analysis error:", error)
      const message = error instanceof Error ? error.message : "Analysis failed. Please try again."
      setStatus({ type: "error", message: `Error: ${message}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const canAnalyze = rtisFile && oheFile && maxDistance > 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">OHE Speed Analyzer</h1>
              <p className="text-sm text-muted-foreground">Railway Infrastructure Analysis Platform</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Control Panel */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="space-y-6">
                {/* RTIS File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="rtis-file" className="text-sm font-medium">
                    Upload RTIS Train Data
                  </Label>
                  <div className="relative">
                    <Input
                      id="rtis-file"
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleRtisUpload}
                      className="cursor-pointer"
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {rtisFile && <p className="text-xs text-muted-foreground">Selected: {rtisFile.name}</p>}
                </div>

                {/* OHE File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="ohe-file" className="text-sm font-medium">
                    Upload OHE Structure Data
                  </Label>
                  <div className="relative">
                    <Input
                      id="ohe-file"
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleOheUpload}
                      className="cursor-pointer"
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {oheFile && <p className="text-xs text-muted-foreground">Selected: {oheFile.name}</p>}
                </div>

                {/* Distance Configuration */}
                <div className="space-y-2">
                  <Label htmlFor="max-distance" className="text-sm font-medium">
                    Max Matching Distance (meters)
                  </Label>
                  <Input
                    id="max-distance"
                    type="number"
                    min="1"
                    max="500"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Default: 50 meters</p>
                </div>

                {/* Analyze Button */}
                <Button onClick={handleAnalyze} disabled={!canAnalyze || isProcessing} className="w-full" size="lg">
                  {isProcessing ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Analyze Data
                    </>
                  )}
                </Button>

                {/* Status Area */}
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    status.type === "success"
                      ? "border-chart-4 bg-chart-4/10 text-chart-4"
                      : status.type === "error"
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : status.type === "processing"
                          ? "border-chart-2 bg-chart-2/10 text-chart-2"
                          : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {status.message}
                </div>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-6">
              <h3 className="mb-3 text-sm font-semibold">How It Works</h3>
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  <span>Upload RTIS train GPS tracking data (CSV/Excel)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  <span>Upload OHE structure location data (CSV/Excel)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">3.</span>
                  <span>Configure maximum matching distance threshold</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-foreground">4.</span>
                  <span>System calculates train speed at each OHE location</span>
                </li>
              </ol>
            </Card>
          </div>

          {/* Results Area */}
          <div className="min-h-[600px]">
            {results ? (
              <AnalysisResults data={results} />
            ) : (
              <Card className="flex h-full min-h-[600px] items-center justify-center p-12">
                <div className="text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">No Analysis Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your data files and click Analyze Data to begin
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
